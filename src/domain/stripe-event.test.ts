import { expect, test } from "bun:test";
import Stripe from "stripe";
import { paidOrderId, readStripeEvent } from "#/domain/stripe-event";

test("the async helper accepts a signed test event and reads the order id", async () => {
	const orderId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
	const payload = JSON.stringify({
		id: "evt_test",
		object: "event",
		type: "checkout.session.completed",
		data: {
			object: {
				id: "cs_test",
				object: "checkout.session",
				payment_status: "paid",
				metadata: { orderId },
				client_reference_id: orderId,
			},
		},
	});
	const secret = "whsec_test_secret";
	const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
		payload,
		secret,
	});
	const event = await readStripeEvent(payload, signature, secret);
	expect(paidOrderId(event)).toBe(orderId);
	await expect(
		readStripeEvent(payload, signature, "whsec_other"),
	).rejects.toThrow();
});

test("an unpaid session does not yield an order id", () => {
	expect(
		paidOrderId({
			type: "checkout.session.completed",
			data: {
				object: { payment_status: "unpaid", metadata: { orderId: "abc" } },
			},
		}),
	).toBeNull();
});
