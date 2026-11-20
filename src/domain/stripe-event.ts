import Stripe from "stripe";

export function readStripeEvent(
	rawBody: string,
	signature: string,
	webhookSecret: string,
): Promise<Stripe.Event> {
	return Stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
}

export function paidOrderId(event: {
	type: string;
	data: { object: unknown };
}): string | null {
	if (event.type !== "checkout.session.completed") return null;
	const session = event.data.object;
	if (!session || typeof session !== "object") return null;
	const record = session as {
		payment_status?: string | null;
		metadata?: { orderId?: string } | null;
		client_reference_id?: string | null;
	};
	if (record.payment_status !== "paid") return null;
	const fromMeta = record.metadata?.orderId;
	const fromRef = record.client_reference_id;
	return fromMeta || fromRef || null;
}
