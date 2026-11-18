import { expect, test } from "bun:test";
import { Resend } from "resend";
import { readEnv } from "#/server/env";
import { mailTransport } from "#/server/mail";

test("Resend loads as the SDK constructor", () => {
	expect(typeof Resend).toBe("function");
});

test("mail stays on the log transport until an inbox or a provider is set", () => {
	expect(
		mailTransport(readEnv({ SMTP_HOST: "", RESEND_API_KEY: "" })).kind,
	).toBe("log");
	expect(
		mailTransport(readEnv({ SMTP_HOST: "127.0.0.1", RESEND_API_KEY: "" })).kind,
	).toBe("smtp");
	expect(
		mailTransport(
			readEnv({ SMTP_HOST: "127.0.0.1", RESEND_API_KEY: "re_test" }),
		).kind,
	).toBe("resend");
});
