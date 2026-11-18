import { Resend } from "resend";
import { getDb } from "./db.ts";
import { mailLog } from "./schema.ts";

type SendInput = Parameters<InstanceType<typeof Resend>["emails"]["send"]>[0];

export function resendLoaded(): boolean {
	return typeof Resend === "function";
}

export function mailFrom(): string {
	return process.env.MAIL_FROM?.trim() || "hmongtea.com <updates@hmongtea.com>";
}

export function siteOrigin(): string {
	return process.env.ORIGIN?.trim() || "http://127.0.0.1:3160";
}

export async function deliverEmail(input: { to: string; subject: string; text: string }): Promise<{ mode: "demo" | "resend" }> {
	if (!resendLoaded()) throw new Error("Resend SDK did not load.");
	const key = process.env.RESEND_API_KEY?.trim() ?? "";
	const mode = key ? "resend" : "demo";
	await getDb().insert(mailLog).values({
		id: crypto.randomUUID(),
		toEmail: input.to,
		subject: input.subject,
		body: input.text,
		mode,
		createdAt: new Date(),
	});
	if (mode === "demo") {
		console.info(JSON.stringify({ event: "email_demo", delivered: false, to: input.to, subject: input.subject }));
		return { mode };
	}
	const message: SendInput = { from: mailFrom(), to: input.to, subject: input.subject, text: input.text };
	const resend = new Resend(key);
	await resend.emails.send(message);
	return { mode };
}
