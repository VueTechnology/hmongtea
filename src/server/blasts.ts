import { desc, eq } from "drizzle-orm";
import { chooseRecipients } from "../domain/audience.ts";
import { parseRequired } from "../domain/validate.ts";
import { recordAudit } from "./audit.ts";
import type { AccountRow } from "./auth.ts";
import { requireStaff } from "./auth.ts";
import { randomToken, sha256 } from "./crypto.ts";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { deliverEmail, siteOrigin } from "./mail.ts";
import { accounts, blastRecipients, blasts, preorders, signups, unsubscribeTokens } from "./schema.ts";

export async function sendBlast(staff: AccountRow, audience: "preorder" | "updates", subjectRaw: unknown, bodyRaw: unknown) {
	requireStaff(staff);
	const subject = parseRequired(subjectRaw, 200);
	const body = parseRequired(bodyRaw, 8000);
	if (!subject || !body) throw new AppError("validation", "Write a subject and a message.", "invalid");
	const db = getDb();
	const signupRows = await db.select().from(signups);
	const orderRows = await db
		.select({ email: preorders.contactEmail, optOut: accounts.emailOptOut })
		.from(preorders)
		.innerJoin(accounts, eq(accounts.id, preorders.accountId));
	const opted = (await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.emailOptOut, true))).map((row) => row.email);
	const picks = chooseRecipients({
		audience,
		signups: signupRows.map((row) => ({ email: row.email, status: row.status as "pending" | "confirmed" | "unsubscribed" })),
		preorders: orderRows.map((row) => ({ email: row.email, optOut: row.optOut })),
		optedOut: opted,
	});
	const blastId = crypto.randomUUID();
	const now = new Date();
	await db.insert(blasts).values({ id: blastId, staffId: staff.id, audience, subject, body, createdAt: now });
	for (const pick of picks) {
		await db.insert(blastRecipients).values({
			id: crypto.randomUUID(),
			blastId,
			email: pick.email,
			status: pick.status,
			createdAt: now,
		});
		if (pick.status !== "sent") continue;
		const token = randomToken();
		await db.insert(unsubscribeTokens).values({ tokenHash: sha256(token), email: pick.email, createdAt: now });
		const link = `${siteOrigin()}/updates/unsubscribe?token=${token}`;
		await deliverEmail({
			to: pick.email,
			subject,
			text: [body, ``, `hmongtea.com`, `Unsubscribe:`, link].join("\n"),
		});
	}
	const sent = picks.filter((pick) => pick.status === "sent").length;
	await recordAudit(staff.id, "blast.send", "blast", blastId, { audience, subject, sent, skipped: picks.length - sent });
	return { blastId, sent, skipped: picks.length - sent };
}

export async function listBlasts(staff: AccountRow) {
	requireStaff(staff);
	return getDb().select().from(blasts).orderBy(desc(blasts.createdAt)).limit(50);
}

export async function listRecipients(staff: AccountRow, blastId: string) {
	requireStaff(staff);
	return getDb().select().from(blastRecipients).where(eq(blastRecipients.blastId, blastId));
}
