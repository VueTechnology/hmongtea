import { expect, test } from "bun:test";
import { readPaymentGate } from "./gate.ts";

test("empty Stripe keys stay in demo", () => {
	expect(readPaymentGate({}).kind).toBe("demo");
});

test("a webhook secret is kept only when it starts with whsec_", () => {
	const kept = readPaymentGate({
		STRIPE_SECRET_KEY: " sk_test_abc ",
		STRIPE_PUBLISHABLE_KEY: "pk_test_xyz",
		STRIPE_WEBHOOK_SECRET: " whsec_abc ",
	});
	expect(kept).toEqual({
		kind: "stripe_test",
		secretKey: "sk_test_abc",
		publishableKey: "pk_test_xyz",
		webhookSecret: "whsec_abc",
	});
	const dropped = readPaymentGate({
		STRIPE_SECRET_KEY: "sk_test_abc",
		STRIPE_PUBLISHABLE_KEY: "pk_test_xyz",
		STRIPE_WEBHOOK_SECRET: "sec_other",
	});
	expect(dropped.kind).toBe("stripe_test");
	if (dropped.kind === "stripe_test") expect(dropped.webhookSecret).toBeNull();
});

test("live keys are refused", () => {
	const gate = readPaymentGate({ STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_PUBLISHABLE_KEY: "pk_live_xyz" });
	expect(gate.kind).toBe("refused");
});
