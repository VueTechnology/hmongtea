import { desc, eq, ilike } from "drizzle-orm";
import { parseEmail, parseOptional, likePattern } from "../domain/validate.ts";
import { recordAudit } from "./audit.ts";
import type { AccountRow } from "./auth.ts";
import { requireStaff } from "./auth.ts";
import { randomToken, sha256 } from "./crypto.ts";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { deliverEmail, siteOrigin } from "./mail.ts";
import { hitLimit, SIGNUP_LIMIT } from "./rate.ts";
import { accounts, signups, unsubscribeTokens } from "./schema.ts";

async function issueUnsubscribe(email: string) {
	const token = randomToken();
	await getDb().insert(unsubscribeTokens).values({ tokenHash: sha256(token), email, createdAt: new Date() });
	return `${siteOrigin()}/updates/unsubscribe?token=${token}`;
}

export async function createSignup(emailRaw: unknown, nameRaw: unknown, ip: string) {
	const email = parseEmail(emailRaw);
	const name = parseOptional(nameRaw, 120);
	if (!email) throw new AppError("validation", "Enter an email.", "email");
	if (name === null) throw new AppError("validation", "Check the form and try again.", "invalid");
	await hitLimit(`updates:${ip}:${email}`, SIGNUP_LIMIT);
	const db = getDb();
	const [existing] = await db.select().from(signups).where(eq(signups.email, email)).limit(1);
	if (existing?.status === "confirmed") throw new AppError("conflict", "This email is already confirmed.", "subscribed");
	const confirm = randomToken();
	const now = new Date();
	if (existing) {
		await db
			.update(signups)
			.set({
				name: name || existing.name,
				status: "pending",
				confirmTokenHash: sha256(confirm),
				confirmedAt: null,
				unsubscribedAt: null,
			})
			.where(eq(signups.id, existing.id));
	} else {
		await db.insert(signups).values({
			id: crypto.randomUUID(),
			email,
			name: name || null,
			status: "pending",
			confirmTokenHash: sha256(confirm),
			createdAt: now,
			confirmedAt: null,
			unsubscribedAt: null,
		});
	}
	const unsubscribe = await issueUnsubscribe(email);
	const confirmUrl = `${siteOrigin()}/updates/confirm?token=${confirm}`;
	await deliverEmail({
		to: email,
		subject: "Confirm your hmongtea.com updates",
		text: [`Confirm your email for hmongtea.com updates.`, ``, confirmUrl, ``, `Unsubscribe:`, unsubscribe].join("\n"),
	});
}

export async function confirmSignup(token: string) {
	if (!token) return "invalid" as const;
	const db = getDb();
	const [row] = await db.select().from(signups).where(eq(signups.confirmTokenHash, sha256(token))).limit(1);
	if (!row || row.status !== "pending") return "invalid" as const;
	await db
		.update(signups)
		.set({ status: "confirmed", confirmTokenHash: null, confirmedAt: new Date(), unsubscribedAt: null })
		.where(eq(signups.id, row.id));
	return "confirmed" as const;
}

export async function unsubscribeToken(token: string) {
	if (!token) return "invalid" as const;
	const db = getDb();
	const [row] = await db.select().from(unsubscribeTokens).where(eq(unsubscribeTokens.tokenHash, sha256(token))).limit(1);
	if (!row) return "invalid" as const;
	await applyOptOut(row.email);
	return "done" as const;
}

export async function applyOptOut(email: string) {
	const db = getDb();
	const now = new Date();
	await db.update(accounts).set({ emailOptOut: true, updatedAt: now }).where(eq(accounts.email, email));
	const [signup] = await db.select().from(signups).where(eq(signups.email, email)).limit(1);
	if (!signup) return;
	if (signup.status === "unsubscribed") return;
	await db.update(signups).set({ status: "unsubscribed", unsubscribedAt: now, confirmTokenHash: null }).where(eq(signups.id, signup.id));
}

export async function listSignups(staff: AccountRow, q: string) {
	requireStaff(staff);
	const rows = getDb().select().from(signups);
	const filtered = q ? rows.where(ilike(signups.email, likePattern(q))) : rows;
	return filtered.orderBy(desc(signups.createdAt)).limit(200);
}

export async function updateSignupName(staff: AccountRow, id: string, nameRaw: unknown) {
	requireStaff(staff);
	const name = parseOptional(nameRaw, 120);
	if (name === null) throw new AppError("validation", "Check the form and try again.", "invalid");
	const updated = await getDb().update(signups).set({ name: name || null }).where(eq(signups.id, id)).returning({ id: signups.id });
	if (updated.length === 0) throw new AppError("not_found", "No sign-up.", "invalid");
	await recordAudit(staff.id, "signup.edit", "signup", id, { name: name || "" });
}

export async function deleteSignup(staff: AccountRow, id: string) {
	requireStaff(staff);
	const deleted = await getDb().delete(signups).where(eq(signups.id, id)).returning({ id: signups.id });
	if (deleted.length === 0) throw new AppError("not_found", "No sign-up.", "invalid");
	await recordAudit(staff.id, "signup.delete", "signup", id, {});
}
