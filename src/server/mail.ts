import { Resend } from "resend";
import type { Database } from "#/db/client";
import { mailLog } from "#/db/schema";
import { newId } from "#/domain/secret";
import type { AppEnv } from "#/server/env";
import { sendSmtp } from "#/server/smtp";

export type OutboundMail = { to: string; subject: string; body: string };

export interface MailTransport {
	readonly kind: "log" | "smtp" | "resend";
	send(message: OutboundMail): Promise<void>;
}

export function mailTransport(env: AppEnv): MailTransport {
	if (env.resendApiKey) return new ResendTransport(env);
	if (env.smtpHost) return new SmtpTransport(env);
	return new LogTransport();
}

class LogTransport implements MailTransport {
	readonly kind = "log" as const;
	async send(): Promise<void> {}
}

class SmtpTransport implements MailTransport {
	readonly kind = "smtp" as const;
	constructor(private readonly env: AppEnv) {}
	async send(message: OutboundMail): Promise<void> {
		await sendSmtp({
			host: this.env.smtpHost,
			port: this.env.smtpPort,
			from: "updates@hmongtea.com",
			to: message.to,
			subject: message.subject,
			body: message.body,
		});
	}
}

class ResendTransport implements MailTransport {
	readonly kind = "resend" as const;
	constructor(private readonly env: AppEnv) {}
	async send(message: OutboundMail): Promise<void> {
		const resend = new Resend(this.env.resendApiKey);
		const from = this.env.resendFrom || "hmongtea.com <updates@hmongtea.com>";
		const result = await resend.emails.send({
			from,
			to: message.to,
			subject: message.subject,
			text: message.body,
		});
		if (result.error) throw new Error("Resend refused the message");
	}
}

export async function deliverEmail(
	db: Database,
	env: AppEnv,
	message: OutboundMail,
): Promise<"logged" | "sent"> {
	const transport = mailTransport(env);
	if (transport.kind === "resend") {
		await transport.send(message);
		return "sent";
	}
	await db.insert(mailLog).values({
		id: newId(),
		toEmail: message.to,
		subject: message.subject,
		body: message.body,
	});
	if (transport.kind === "smtp") {
		try {
			await transport.send(message);
		} catch (error) {
			const reason =
				error instanceof Error ? error.message : "mail send failed";
			console.error(reason);
		}
	}
	return "logged";
}

export { Resend };
