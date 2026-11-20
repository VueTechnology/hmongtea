import { expect, test } from "bun:test";
import { assertTestSecret, readPaymentGate } from "#/domain/payment-gate";

test("empty Stripe keys stay in demo", () => {
	expect(readPaymentGate({}).kind).toBe("demo");
	expect(readPaymentGate({ STRIPE_WEBHOOK_SECRET: "whsec_test" }).kind).toBe(
		"demo",
	);
});

test("a partial key pair is refused", () => {
	expect(readPaymentGate({ STRIPE_SECRET_KEY: "sk_test_abc" })).toEqual({
		kind: "refused",
		reason: "partial-keys",
	});
});

test("live keys are refused", () => {
	expect(
		readPaymentGate({
			STRIPE_SECRET_KEY: "sk_live_abc",
			STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
		}),
	).toEqual({ kind: "refused", reason: "not-test-keys" });
});

test("a webhook secret is kept only when it starts with whsec_", () => {
	expect(
		readPaymentGate({
			STRIPE_SECRET_KEY: " sk_test_abc ",
			STRIPE_PUBLISHABLE_KEY: " pk_test_xyz ",
			STRIPE_WEBHOOK_SECRET: " whsec_abc ",
		}),
	).toMatchObject({ kind: "stripe-test", webhookSecret: "whsec_abc" });
	expect(
		readPaymentGate({
			STRIPE_SECRET_KEY: "sk_test_abc",
			STRIPE_PUBLISHABLE_KEY: "pk_test_xyz",
			STRIPE_WEBHOOK_SECRET: "not-a-secret",
		}),
	).toMatchObject({ kind: "stripe-test", webhookSecret: null });
});

test("checkout refuses a secret that is not a test key", () => {
	expect(() => assertTestSecret("sk_live_abc")).toThrow();
	expect(assertTestSecret("sk_test_abc")).toBe("sk_test_abc");
});
