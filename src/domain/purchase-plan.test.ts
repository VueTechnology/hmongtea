import { expect, test } from "bun:test";
import {
	dateAfterWeeks,
	dateStringAfterWeeks,
	makePurchasePlan,
	parseIntervalWeeks,
	parseRetailCartCookie,
	type RetailCart,
	serializeRetailCartCookie,
} from "#/domain/purchase-plan";

test("legacy and planned cart cookies parse at the boundary", () => {
	expect(parseRetailCartCookie(null)).toEqual({ qty: 0, planKind: "one-time" });
	expect(parseRetailCartCookie("2")).toEqual({ qty: 2, planKind: "one-time" });
	expect(parseRetailCartCookie("subscription:2")).toEqual({
		qty: 2,
		planKind: "subscription",
	});
	expect(parseRetailCartCookie("subscription:2.5")).toEqual({
		qty: 0,
		planKind: "one-time",
	});
	expect(parseRetailCartCookie("unknown:2")).toEqual({
		qty: 0,
		planKind: "one-time",
	});
});

test("planned cart cookies round trip", () => {
	const cart: RetailCart = { qty: 3, planKind: "subscription" };
	expect(parseRetailCartCookie(serializeRetailCartCookie(cart))).toEqual(cart);
});

test("subscription intervals stay within the supported schedule", () => {
	expect(parseIntervalWeeks("4")).toBe(4);
	expect(parseIntervalWeeks("0")).toBeNull();
	expect(parseIntervalWeeks("53")).toBeNull();
	expect(parseIntervalWeeks("2.5")).toBeNull();
});

test("one-time plans do not carry subscription state", () => {
	expect(makePurchasePlan("one-time", 8)).toEqual({ kind: "one-time" });
	expect(makePurchasePlan("subscription", 8)).toEqual({
		kind: "subscription",
		intervalWeeks: 8,
	});
});

test("schedule changes use calendar weeks in UTC", () => {
	expect(dateAfterWeeks(new Date("2026-11-21T23:00:00Z"), 4)).toBe(
		"2026-12-19",
	);
	expect(dateStringAfterWeeks("2026-12-19", 4)).toBe("2027-01-16");
});
