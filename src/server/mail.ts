import { Resend } from "resend";
import type { Database } from "#/db/client";
import { mailLog } from "#/db/schema";
import { newId } from "#/domain/secret";
import type { AppEnv } from "#/server/env";

export type OutboundMail = { to: string; subject: string; body: string };

export async function deliverEmail(
	db: Database,
	env: AppEnv,
	message: OutboundMail,
): Promise<"logged" | "sent"> {
	if (!env.resendApiKey) {
		await db.insert(mailLog).values({
			id: newId(),
			toEmail: message.to,
			subject: message.subject,
			body: message.body,
		});
		return "logged";
	}
	const resend = new Resend(env.resendApiKey);
	const from = env.resendFrom || "hmongtea.com <updates@hmongtea.com>";
	const result = await resend.emails.send({
		from,
		to: message.to,
		subject: message.subject,
		text: message.body,
	});
	if (result.error) throw new Error("Resend refused the message");
	return "sent";
}

export { Resend };
