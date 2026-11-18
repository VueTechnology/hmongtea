import { expect, test } from "bun:test";
import { chooseRecipients } from "./audience.ts";

test("update blasts skip pending and unsubscribed addresses", () => {
	const picks = chooseRecipients({
		audience: "updates",
		signups: [
			{ email: "a@example.com", status: "confirmed" },
			{ email: "b@example.com", status: "pending" },
			{ email: "c@example.com", status: "unsubscribed" },
			{ email: "d@example.com", status: "confirmed" },
		],
		preorders: [],
		optedOut: ["d@example.com"],
	});
	expect(picks).toEqual([
		{ email: "a@example.com", status: "sent" },
		{ email: "b@example.com", status: "skipped_pending" },
		{ email: "c@example.com", status: "skipped_unsubscribed" },
		{ email: "d@example.com", status: "skipped_unsubscribed" },
	]);
});

test("pre-order blasts honor opt out and ignore other signups", () => {
	const picks = chooseRecipients({
		audience: "preorder",
		signups: [{ email: "news@example.com", status: "confirmed" }],
		preorders: [
			{ email: "buyer@example.com", optOut: false },
			{ email: "buyer@example.com", optOut: false },
			{ email: "stop@example.com", optOut: true },
		],
		optedOut: [],
	});
	expect(picks).toEqual([
		{ email: "buyer@example.com", status: "sent" },
		{ email: "stop@example.com", status: "skipped_unsubscribed" },
	]);
});
