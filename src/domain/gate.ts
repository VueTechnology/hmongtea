export type PaymentGate =
	| { kind: "demo" }
	| { kind: "stripe_test"; secretKey: string; publishableKey: string; webhookSecret: string | null }
	| { kind: "refused"; reason: string };

const refusedReason = "Checkout is blocked. Stripe keys must start with sk_test_ and pk_test_.";

export function assertTestSecret(key: string): string {
	if (!key.startsWith("sk_test_")) throw new Error("Refusing a Stripe secret that is not an sk_test_ key.");
	return key;
}

export function assertTestPublishable(key: string): string {
	if (!key.startsWith("pk_test_")) throw new Error("Refusing a Stripe publishable key that is not a pk_test_ key.");
	return key;
}

export function readPaymentGate(env: { [key: string]: string | undefined }): PaymentGate {
	const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
	const publishableKey = env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
	if (secretKey === "" && publishableKey === "") return { kind: "demo" };
	if (!secretKey.startsWith("sk_test_") || !publishableKey.startsWith("pk_test_")) {
		return { kind: "refused", reason: refusedReason };
	}
	return {
		kind: "stripe_test",
		secretKey: assertTestSecret(secretKey),
		publishableKey: assertTestPublishable(publishableKey),
		webhookSecret: webhookSecret.startsWith("whsec_") ? webhookSecret : null,
	};
}

export function paymentLabel(gate: PaymentGate): string {
	if (gate.kind === "demo") return "Demo checkout. No card is charged.";
	if (gate.kind === "stripe_test") return "Test card checkout.";
	return gate.reason;
}
