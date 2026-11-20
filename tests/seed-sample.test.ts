import { expect, test } from "bun:test";
import {
	PROTECTED_EMAILS,
	SAMPLE_BLASTS,
	SAMPLE_CUSTOMERS,
	SAMPLE_ORDERS,
	SAMPLE_PARTNERS,
	SAMPLE_SIGNUPS,
	SAMPLE_ID_PREFIX,
	isProtectedEmail,
	isSampleEmail,
} from "../scripts/seed-sample-plan";

test("sample plan fills every staff list without touching test logins", () => {
	expect(SAMPLE_CUSTOMERS).toHaveLength(25);
	expect(SAMPLE_PARTNERS).toHaveLength(10);
	expect(SAMPLE_ORDERS).toHaveLength(40);
	expect(SAMPLE_SIGNUPS.length).toBeGreaterThanOrEqual(8);
	expect(SAMPLE_BLASTS.length).toBeGreaterThanOrEqual(2);
	expect(PROTECTED_EMAILS).toEqual([
		"staff@hmongtea.com",
		"customer@hmongtea.com",
		"partner@hmongtea.com",
	]);

	const emails = new Set<string>();
	const ids = new Set<string>();
	const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000;
	const now = Date.now();

	for (const person of [...SAMPLE_CUSTOMERS, ...SAMPLE_PARTNERS]) {
		expect(person.id.startsWith(SAMPLE_ID_PREFIX)).toBe(true);
		expect(isSampleEmail(person.email)).toBe(true);
		expect(isProtectedEmail(person.email)).toBe(false);
		expect(emails.has(person.email)).toBe(false);
		emails.add(person.email);
		expect(ids.has(person.id)).toBe(false);
		ids.add(person.id);
		expect(now - person.createdAt.getTime()).toBeGreaterThanOrEqual(0);
		expect(now - person.createdAt.getTime()).toBeLessThanOrEqual(sixtyDaysMs);
	}

	const partnerStatuses = new Set(SAMPLE_PARTNERS.map((row) => row.status));
	expect(partnerStatuses.has("active")).toBe(true);
	expect(partnerStatuses.has("pending")).toBe(true);
	expect(partnerStatuses.has("rejected")).toBe(true);

	const orderStatuses = new Set(SAMPLE_ORDERS.map((row) => row.status));
	expect(orderStatuses).toEqual(new Set(["unpaid", "placed", "shipped", "cancelled"]));
	const sides = new Set(SAMPLE_ORDERS.map((row) => row.side));
	expect(sides).toEqual(new Set(["retail", "wholesale"]));

	for (const order of SAMPLE_ORDERS) {
		expect(order.id.startsWith(SAMPLE_ID_PREFIX)).toBe(true);
		expect(ids.has(order.id)).toBe(false);
		ids.add(order.id);
		expect(order.qty * order.unitCents).toBeGreaterThan(0);
		if (order.side === "wholesale") expect(order.qty).toBeGreaterThanOrEqual(12);
		if (order.status === "shipped") {
			expect(order.shipDate).toBeTruthy();
			expect(order.trackingNumber).toBeTruthy();
		} else {
			expect(order.shipDate).toBeNull();
			expect(order.trackingNumber).toBeNull();
		}
		if (order.useProtected) {
			expect(order.shipLine2).toBe("[sample-seed]");
			expect(isProtectedEmail(order.contactEmail)).toBe(true);
		} else {
			expect(isSampleEmail(order.contactEmail)).toBe(true);
			expect(isProtectedEmail(order.contactEmail)).toBe(false);
		}
		if (order.netTerms) {
			expect(order.side).toBe("wholesale");
			expect(order.paymentMode).toBe("net-terms-placeholder");
		}
	}

	const signupStatuses = new Set(SAMPLE_SIGNUPS.map((row) => row.status));
	expect(signupStatuses).toEqual(new Set(["pending", "confirmed", "unsubscribed"]));
	for (const row of SAMPLE_SIGNUPS) {
		expect(isSampleEmail(row.email)).toBe(true);
		expect(row.id.startsWith(SAMPLE_ID_PREFIX)).toBe(true);
	}

	const audiences = new Set(SAMPLE_BLASTS.map((row) => row.audience));
	expect(audiences).toEqual(new Set(["preorder", "updates"]));
	for (const blast of SAMPLE_BLASTS) {
		expect(blast.subject.startsWith("[Sample]")).toBe(true);
		expect(blast.recipients.length).toBeGreaterThan(0);
	}
});
