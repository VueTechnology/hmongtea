import { expect, test } from "bun:test";
import { formatUsd } from "#/domain/money";
import {
	NET_WEIGHT_LABEL,
	RETAIL_CENTS,
	SHIP_WINDOW,
	SUBSCRIPTION_CENTS,
	WHOLESALE_TIERS,
	wholesaleUnit,
} from "#/domain/prices";

test("retail and subscription pack prices match the current offer", () => {
	expect(formatUsd(RETAIL_CENTS)).toBe("$44.94");
	expect(formatUsd(SUBSCRIPTION_CENTS)).toBe("$39.94");
	expect(NET_WEIGHT_LABEL).toBe("4.4 oz (125 g)");
	expect(SHIP_WINDOW).toBe("5 to 7 business days");
});

test("wholesale labels match the shop tiers", () => {
	expect(
		WHOLESALE_TIERS.map((tier) => `${tier.label} ${tier.unitCents}`),
	).toEqual([
		"12 to 23 packs 2400",
		"24 to 47 packs 2200",
		"48 or more packs 2000",
	]);
});

test("wholesale tiers step at 12, 24, and 48", () => {
	expect(wholesaleUnit(11)).toBeNull();
	expect(wholesaleUnit(12)).toBe(2400);
	expect(wholesaleUnit(23)).toBe(2400);
	expect(wholesaleUnit(24)).toBe(2200);
	expect(wholesaleUnit(47)).toBe(2200);
	expect(wholesaleUnit(48)).toBe(2000);
});
