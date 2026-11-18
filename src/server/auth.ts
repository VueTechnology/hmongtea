import { eq } from "drizzle-orm";
import type { AddressInput } from "../domain/validate.ts";
import { parseEmail, parseOptional, parsePassword, parseRequired } from "../domain/validate.ts";
import { normalizeEin } from "../domain/tax-id.ts";
import { recordAudit } from "./audit.ts";
import { encryptTaxId } from "./crypto.ts";
import { randomToken, sha256 } from "./crypto.ts";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { hitLimit, LOGIN_LIMIT, SIGNUP_LIMIT } from "./rate.ts";
import { accounts, addresses, sessions, wholesaleProfiles } from "./schema.ts";

export type AccountRow = typeof accounts.$inferSelect;

let dummy: string | null = null;

async function dummyHash() {
	if (!dummy) dummy = await hashPassword(crypto.randomUUID());
	return dummy;
}

function pgCode(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	if ("code" in error && typeof error.code === "string") return error.code;
	if ("cause" in error) return pgCode(error.cause);
	return null;
}

function rethrow(error: unknown): never {
	const code = pgCode(error);
	if (code === "23505") throw new AppError("conflict", "An account with that email already exists.", "conflict");
	if (code === "23514") throw new AppError("validation", "That value is not allowed.", "invalid");
	throw error;
}

export async function ensureStaff() {
	const email = process.env.STAFF_EMAIL?.trim().toLowerCase() ?? "";
	const password = process.env.STAFF_PASSWORD ?? "";
	if (!email && !password) return;
	if (!parseEmail(email)) throw new Error("STAFF_EMAIL is not an email.");
	if (password.length < 12) throw new Error("STAFF_PASSWORD must be at least 12 characters.");
	const db = getDb();
	const [existing] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, email)).limit(1);
	if (existing) return;
	const now = new Date();
	await db.insert(accounts).values({
		id: crypto.randomUUID(),
		email,
		passwordHash: await hashPassword(password),
		role: "staff",
		accountType: null,
		name: "Staff",
		phone: "",
		status: "active",
		emailOptOut: true,
		createdAt: now,
		updatedAt: now,
	});
}

export async function openSession(accountId: string) {
	const token = randomToken();
	const now = new Date();
	await getDb().insert(sessions).values({
		id: crypto.randomUUID(),
		accountId,
		tokenHash: sha256(token),
		expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
		createdAt: now,
	});
	return token;
}

export async function accountFromToken(token: string | undefined | null): Promise<AccountRow | null> {
	if (!token) return null;
	const db = getDb();
	const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, sha256(token))).limit(1);
	if (!session || session.expiresAt.getTime() < Date.now()) return null;
	const [account] = await db.select().from(accounts).where(eq(accounts.id, session.accountId)).limit(1);
	return account ?? null;
}

export async function logout(token: string | undefined | null) {
	if (!token) return;
	await getDb().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function login(emailRaw: unknown, passwordRaw: unknown, ip: string) {
	const email = parseEmail(emailRaw);
	const password = typeof passwordRaw === "string" ? passwordRaw : "";
	if (!email || password.length === 0) throw new AppError("unauthorized", "Email or password does not match.", "credentials");
	await hitLimit(`login:${ip}:${email}`, LOGIN_LIMIT);
	const [account] = await getDb().select().from(accounts).where(eq(accounts.email, email)).limit(1);
	const ok = await verifyPassword(password, account?.passwordHash ?? (await dummyHash()));
	if (!account || !ok) throw new AppError("unauthorized", "Email or password does not match.", "credentials");
	return { token: await openSession(account.id), account };
}

export function requireStaff(account: AccountRow | null): AccountRow {
	if (!account) throw new AppError("unauthorized", "Sign in.", "credentials");
	if (account.role !== "staff") throw new AppError("forbidden", "Staff only.", "forbidden");
	return account;
}

export function requireCustomer(account: AccountRow | null): AccountRow {
	if (!account || account.role !== "customer") throw new AppError("unauthorized", "Sign in.", "credentials");
	return account;
}

export async function registerRetail(input: { email: unknown; password: unknown; name: unknown; phone: unknown }, ip: string) {
	const email = parseEmail(input.email);
	const password = parsePassword(input.password);
	const name = parseRequired(input.name, 120);
	const phone = parseOptional(input.phone, 40);
	if (!email) throw new AppError("validation", "Enter an email.", "email");
	if (!password) throw new AppError("validation", "Use at least 8 characters.", "password");
	if (!name || phone === null) throw new AppError("validation", "Check the form and try again.", "invalid");
	await hitLimit(`signup:${ip}:${email}`, SIGNUP_LIMIT);
	const now = new Date();
	try {
		await getDb().insert(accounts).values({
			id: crypto.randomUUID(),
			email,
			passwordHash: await hashPassword(password),
			role: "customer",
			accountType: "retail",
			name,
			phone,
			status: "active",
			emailOptOut: false,
			createdAt: now,
			updatedAt: now,
		});
	} catch (error) {
		rethrow(error);
	}
}

export async function registerWholesale(
	input: {
		email: unknown;
		password: unknown;
		legalName: unknown;
		dba: unknown;
		phone: unknown;
		contactPerson: unknown;
		website: unknown;
		resellerCertificate: unknown;
		taxId: unknown;
		address: AddressInput;
	},
	ip: string,
) {
	const email = parseEmail(input.email);
	const password = parsePassword(input.password);
	const legalName = parseRequired(input.legalName, 160);
	const dba = parseRequired(input.dba, 160);
	const phone = parseRequired(input.phone, 40);
	const contactPerson = parseRequired(input.contactPerson, 120);
	const website = parseOptional(input.website, 200);
	const certificate = parseOptional(input.resellerCertificate, 80);
	const taxId = typeof input.taxId === "string" ? normalizeEin(input.taxId) : null;
	if (!email) throw new AppError("validation", "Enter an email.", "email");
	if (!password) throw new AppError("validation", "Use at least 8 characters.", "password");
	if (!legalName || !dba || !phone || !contactPerson || website === null || certificate === null) {
		throw new AppError("validation", "Check the form and try again.", "invalid");
	}
	if (!taxId) throw new AppError("validation", "Enter a tax ID with 9 digits.", "tax");
	await hitLimit(`signup:${ip}:${email}`, SIGNUP_LIMIT);
	const now = new Date();
	const id = crypto.randomUUID();
	try {
		await getDb().transaction(async (tx) => {
			await tx.insert(accounts).values({
				id,
				email,
				passwordHash: await hashPassword(password),
				role: "customer",
				accountType: "wholesale",
				name: contactPerson,
				phone,
				status: "pending",
				emailOptOut: false,
				createdAt: now,
				updatedAt: now,
			});
			await tx.insert(wholesaleProfiles).values({
				accountId: id,
				legalName,
				dba,
				line1: input.address.line1,
				line2: input.address.line2,
				city: input.address.city,
				region: input.address.region,
				postal: input.address.postal,
				country: input.address.country,
				phone,
				contactPerson,
				website: website || null,
				resellerCertificate: certificate || null,
				taxIdCipher: encryptTaxId(taxId),
				taxIdLast4: taxId.slice(-4),
				netTermsPlaceholder: false,
				createdAt: now,
			});
		});
	} catch (error) {
		rethrow(error);
	}
}

export async function updateContact(account: AccountRow, input: { name: unknown; phone: unknown; email: unknown }) {
	const name = parseRequired(input.name, 120);
	const phone = parseOptional(input.phone, 40);
	const email = parseEmail(input.email);
	if (!name || phone === null || !email) throw new AppError("validation", "Check the form and try again.", "invalid");
	try {
		await getDb()
			.update(accounts)
			.set({ name, phone, email, updatedAt: new Date() })
			.where(eq(accounts.id, account.id));
	} catch (error) {
		rethrow(error);
	}
}

export async function saveAddress(accountId: string, address: AddressInput) {
	const now = new Date();
	await getDb()
		.insert(addresses)
		.values({ accountId, ...address, updatedAt: now })
		.onConflictDoUpdate({
			target: addresses.accountId,
			set: { ...address, updatedAt: now },
		});
}

export async function deleteAddress(account: AccountRow) {
	requireCustomer(account);
	const deleted = await getDb().delete(addresses).where(eq(addresses.accountId, account.id)).returning({ id: addresses.accountId });
	if (deleted.length === 0) throw new AppError("not_found", "No address is saved.", "invalid");
}

export async function setOptOut(account: AccountRow, optOut: boolean) {
	await getDb().update(accounts).set({ emailOptOut: optOut, updatedAt: new Date() }).where(eq(accounts.id, account.id));
}

export async function approveWholesale(staff: AccountRow, accountId: string) {
	requireStaff(staff);
	const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
	if (!account || account.accountType !== "wholesale") throw new AppError("not_found", "No wholesale account.", "invalid");
	await getDb().update(accounts).set({ status: "active", updatedAt: new Date() }).where(eq(accounts.id, accountId));
	await recordAudit(staff.id, "account.approve", "account", accountId, { status: "active" });
}

export async function rejectWholesale(staff: AccountRow, accountId: string) {
	requireStaff(staff);
	const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
	if (!account || account.accountType !== "wholesale") throw new AppError("not_found", "No wholesale account.", "invalid");
	await getDb().update(accounts).set({ status: "rejected", updatedAt: new Date() }).where(eq(accounts.id, accountId));
	await recordAudit(staff.id, "account.reject", "account", accountId, { status: "rejected" });
}

export async function setNetTerms(staff: AccountRow, accountId: string, enabled: boolean) {
	requireStaff(staff);
	const updated = await getDb()
		.update(wholesaleProfiles)
		.set({ netTermsPlaceholder: enabled })
		.where(eq(wholesaleProfiles.accountId, accountId))
		.returning({ id: wholesaleProfiles.accountId });
	if (updated.length === 0) throw new AppError("not_found", "No wholesale account.", "invalid");
	await recordAudit(staff.id, "account.net_terms", "account", accountId, { netTermsPlaceholder: enabled });
}

export async function deleteRejectedWholesale(staff: AccountRow, accountId: string) {
	requireStaff(staff);
	const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
	if (!account || account.role !== "customer" || account.status !== "rejected") {
		throw new AppError("forbidden", "Only a rejected wholesale account can be deleted.", "forbidden");
	}
	try {
		const deleted = await getDb().delete(accounts).where(eq(accounts.id, accountId)).returning({ id: accounts.id });
		if (deleted.length === 0) throw new AppError("not_found", "No account.", "invalid");
	} catch (error) {
		if (pgCode(error) === "23503") throw new AppError("conflict", "This account still has pre-orders.", "conflict");
		rethrow(error);
	}
	await recordAudit(staff.id, "account.delete", "account", accountId, {});
}
