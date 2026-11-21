import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "#/db/client";
import { accounts, passwordResets } from "#/db/schema";
import type { PartnerTierId } from "#/domain/prices";
import { newId, newToken, sha256 } from "#/domain/secret";
import {
	passwordMail,
	quoteOnBehalf,
	resetExpiry,
	resetStillValid,
} from "#/domain/staff-desk";
import type { AddressInput } from "#/domain/validate";
import type { AppEnv } from "#/server/env";
import { deliverEmail } from "#/server/mail";
import { hashPassword } from "#/server/passwords";
import {
	audit,
	createAccount,
	findAccountByEmail,
	findAccountById,
	insertOrder,
	StockShort,
} from "#/server/store";

export type DeskRole = "customer" | "partner";

export async function createDeskAccount(
	db: Database,
	env: AppEnv,
	staffId: string,
	input: {
		name: string;
		email: string;
		phone: string;
		role: DeskRole;
		company: string;
		tier: PartnerTierId | null;
		password: string | null;
	},
): Promise<{ ok: true; id: string } | { ok: false; error: "taken" | "tier" }> {
	if (input.role === "partner" && !input.tier)
		return { ok: false, error: "tier" };
	const secret = input.password ?? `${newToken()}${newToken()}`;
	const created = await createAccount(db, env, {
		email: input.email,
		password: secret,
		role: "customer",
		side: input.role === "partner" ? "wholesale" : "retail",
		status: "active",
		name: input.name,
		phone: input.phone,
		legalName: input.role === "partner" ? input.company : "",
		contactPerson: input.name,
		pricingTier: input.role === "partner" ? input.tier : null,
	});
	if (!created.ok) return { ok: false, error: "taken" };
	if (!input.password) {
		const token = await issuePasswordToken(db, created.id, "set");
		const mail = passwordMail({
			origin: env.appOrigin,
			token,
			purpose: "set",
		});
		await deliverEmail(db, env, {
			to: input.email,
			subject: mail.subject,
			body: mail.body,
		});
	}
	await audit(
		db,
		staffId,
		"account.create",
		"account",
		created.id,
		`${input.role} ${input.email}`,
	);
	return { ok: true, id: created.id };
}

export async function placeDeskOrder(
	db: Database,
	staffId: string,
	input: {
		accountId: string;
		qty: number;
		contactName: string;
		phone: string;
		address: AddressInput;
	},
): Promise<
	| { ok: true; orderId: string }
	| { ok: false; error: "missing" | "pending" | "qty" | "moq" | "stock" }
> {
	const account = await findAccountById(db, input.accountId);
	if (account?.role !== "customer") return { ok: false, error: "missing" };
	if (account.status !== "active") return { ok: false, error: "pending" };
	const quote = quoteOnBehalf({
		side: account.side,
		tier: account.pricingTier,
		qty: input.qty,
	});
	if (!quote.ok) return quote;
	let orderId: string;
	try {
		orderId = await insertOrder(
			db,
			{
				account,
				orderSide: account.side,
				qty: input.qty,
				contactName: input.contactName,
				contactEmail: account.email,
				phone: input.phone,
				address: input.address,
				payment: "demo",
				placedByStaffId: staffId,
			},
			quote.quote,
		);
	} catch (error) {
		if (error instanceof StockShort) return { ok: false, error: "stock" };
		throw error;
	}
	await audit(
		db,
		staffId,
		"order.behalf",
		"order",
		orderId,
		`${account.email} ${quote.quote.qty} ${quote.quote.unitCents}`,
	);
	return { ok: true, orderId };
}

export async function sendDeskReset(
	db: Database,
	env: AppEnv,
	staffId: string,
	email: string,
): Promise<"ok" | "missing"> {
	const account = await findAccountByEmail(db, email);
	if (account?.role !== "customer") return "missing";
	await sendReset(db, env, account.id, account.email, "reset");
	await audit(db, staffId, "password.reset_send", "account", account.id, email);
	return "ok";
}

export async function requestPublicReset(
	db: Database,
	env: AppEnv,
	email: string,
): Promise<void> {
	const account = await findAccountByEmail(db, email);
	if (account?.role !== "customer") return;
	await sendReset(db, env, account.id, account.email, "reset");
}

export async function completeReset(
	db: Database,
	token: string,
	password: string,
): Promise<"ok" | "invalid"> {
	const hash = sha256(token);
	return db.transaction(async (tx) => {
		const rows = await tx
			.select()
			.from(passwordResets)
			.where(eq(passwordResets.tokenHash, hash))
			.limit(1);
		const row = rows[0];
		if (!row || !resetStillValid(row.expiresAt, row.usedAt, new Date()))
			return "invalid";
		const marked = await tx
			.update(passwordResets)
			.set({ usedAt: new Date() })
			.where(and(eq(passwordResets.id, row.id), isNull(passwordResets.usedAt)))
			.returning({ id: passwordResets.id });
		if (marked.length !== 1) return "invalid";
		await tx
			.update(accounts)
			.set({
				passwordHash: await hashPassword(password),
				updatedAt: new Date(),
			})
			.where(eq(accounts.id, row.accountId));
		return "ok";
	});
}

export async function listDeskTargets(db: Database) {
	const rows = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.role, "customer"), eq(accounts.status, "active")))
		.orderBy(accounts.email);
	return rows.map((row) => ({
		id: row.id,
		email: row.email,
		name: row.name || row.legalName || row.email,
		side: row.side,
		tier: row.pricingTier,
	}));
}

async function sendReset(
	db: Database,
	env: AppEnv,
	accountId: string,
	email: string,
	purpose: "set" | "reset",
): Promise<void> {
	const token = await issuePasswordToken(db, accountId, purpose);
	const mail = passwordMail({ origin: env.appOrigin, token, purpose });
	await deliverEmail(db, env, {
		to: email,
		subject: mail.subject,
		body: mail.body,
	});
}

async function issuePasswordToken(
	db: Database,
	accountId: string,
	purpose: "set" | "reset",
): Promise<string> {
	await db
		.update(passwordResets)
		.set({ usedAt: new Date() })
		.where(
			and(
				eq(passwordResets.accountId, accountId),
				isNull(passwordResets.usedAt),
			),
		);
	const token = newToken();
	await db.insert(passwordResets).values({
		id: newId(),
		accountId,
		tokenHash: sha256(token),
		purpose,
		expiresAt: resetExpiry(new Date()),
	});
	return token;
}
