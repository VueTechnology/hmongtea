import Stripe from "stripe";
import { assertTestSecret } from "../domain/gate.ts";
import { PRODUCT_NAME } from "../domain/prices.ts";
import { eq } from "drizzle-orm";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { preorders } from "./schema.ts";

export function checkoutSessionParams(input: {
	orderId: string;
	email: string;
	qty: number;
	unitCents: number;
	origin: string;
}): Stripe.Checkout.SessionCreateParams {
	return {
		mode: "payment",
		customer_email: input.email,
		client_reference_id: input.orderId,
		metadata: { orderId: input.orderId },
		line_items: [
			{
				quantity: input.qty,
				price_data: {
					currency: "usd",
					unit_amount: input.unitCents,
					product_data: { name: PRODUCT_NAME },
				},
			},
		],
		success_url: `${input.origin}/account/orders/${input.orderId}?paid=1`,
		cancel_url: `${input.origin}/checkout?error=payment`,
	};
}

export async function openStripeCheckout(input: {
	secretKey: string;
	orderId: string;
	email: string;
	qty: number;
	unitCents: number;
	origin: string;
}): Promise<string> {
	const stripe = new Stripe(assertTestSecret(input.secretKey));
	const session = await stripe.checkout.sessions.create(checkoutSessionParams(input), {
		idempotencyKey: `preorder-${input.orderId}`,
	});
	if (!session.url || !session.url.startsWith("https://checkout.stripe.com")) {
		throw new AppError("validation", "Stripe did not return a Checkout URL.", "payment");
	}
	await getDb().update(preorders).set({ stripeSessionId: session.id, updatedAt: new Date() }).where(eq(preorders.id, input.orderId));
	return session.url;
}

export async function constructStripeEvent(rawBody: string, signature: string, webhookSecret: string, secretKey: string) {
	if (!webhookSecret.startsWith("whsec_")) throw new AppError("forbidden", "Webhook secret is not kept.", "payment");
	assertTestSecret(secretKey);
	return Stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
}

export async function applyPaidCheckout(event: {
	type: string;
	data: { object: { id?: string; payment_status?: string | null; metadata?: { orderId?: string } | null } };
}) {
	if (event.type !== "checkout.session.completed") return { applied: false };
	const session = event.data.object;
	if (session.payment_status !== "paid" || !session.metadata?.orderId) return { applied: false };
	const db = getDb();
	const [order] = await db.select().from(preorders).where(eq(preorders.id, session.metadata.orderId)).limit(1);
	if (!order || order.paymentMode !== "stripe_test") return { applied: false };
	if (order.paymentStatus === "paid") return { applied: true };
	await db
		.update(preorders)
		.set({ paymentStatus: "paid", stripeSessionId: session.id ?? order.stripeSessionId, updatedAt: new Date() })
		.where(eq(preorders.id, order.id));
	return { applied: true };
}
