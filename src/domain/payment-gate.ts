export type StripeEnv = {
	readonly STRIPE_SECRET_KEY?: string;
	readonly STRIPE_PUBLISHABLE_KEY?: string;
	readonly STRIPE_WEBHOOK_SECRET?: string;
};

export type PaymentRefusal = "partial-keys" | "not-test-keys";

export type PaymentGate =
	| { readonly kind: "demo" }
	| {
			readonly kind: "stripe-test";
			readonly secretKey: string;
			readonly publishableKey: string;
			readonly webhookSecret: string | null;
	  }
	| { readonly kind: "refused"; readonly reason: PaymentRefusal };

function trimmed(value: string | undefined): string {
	return (value ?? "").trim();
}

export function readPaymentGate(env: StripeEnv): PaymentGate {
	const secretKey = trimmed(env.STRIPE_SECRET_KEY);
	const publishableKey = trimmed(env.STRIPE_PUBLISHABLE_KEY);
	const webhook = trimmed(env.STRIPE_WEBHOOK_SECRET);
	if (!secretKey && !publishableKey) return { kind: "demo" };
	if (!secretKey || !publishableKey)
		return { kind: "refused", reason: "partial-keys" };
	if (
		secretKey.startsWith("sk_test_") &&
		publishableKey.startsWith("pk_test_")
	) {
		return {
			kind: "stripe-test",
			secretKey,
			publishableKey,
			webhookSecret: webhook.startsWith("whsec_") ? webhook : null,
		};
	}
	return { kind: "refused", reason: "not-test-keys" };
}

export function assertTestSecret(secretKey: string): string {
	if (!secretKey.startsWith("sk_test_")) {
		throw new Error(
			"Refusing checkout. The Stripe secret key is not a test key.",
		);
	}
	return secretKey;
}
