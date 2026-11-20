import { expect, test } from "bun:test";
import { parseCartQty, quoteCart } from "#/domain/cart";

test("a guest cart cookie only accepts a quantity", () => {
	expect(parseCartQty(null)).toBe(0);
	expect(parseCartQty("2")).toBe(2);
	expect(parseCartQty("2.5")).toBe(0);
	expect(parseCartQty("1000")).toBe(0);
});

test("retail quotes use the retail price", () => {
	const quote = quoteCart({
		accountSide: "retail",
		accountStatus: "active",
		orderSide: "retail",
		qty: 2,
	});
	expect(quote).toEqual({
		ok: true,
		quote: { side: "retail", qty: 2, unitCents: 3200, totalCents: 6400 },
	});
});

test("a retail account cannot take a wholesale price", () => {
	const quote = quoteCart({
		accountSide: "retail",
		accountStatus: "active",
		orderSide: "wholesale",
		qty: 12,
	});
	expect(quote).toEqual({ ok: false, error: "retail-blocked" });
});

test("a pending wholesale account cannot take a tier price", () => {
	const quote = quoteCart({
		accountSide: "wholesale",
		accountStatus: "pending",
		orderSide: "wholesale",
		qty: 12,
	});
	expect(quote).toEqual({ ok: false, error: "not-approved" });
});

test("an approved wholesale order uses the tier for the quantity", () => {
	const quote = quoteCart({
		accountSide: "wholesale",
		accountStatus: "active",
		orderSide: "wholesale",
		qty: 24,
	});
	expect(quote).toEqual({
		ok: true,
		quote: { side: "wholesale", qty: 24, unitCents: 2200, totalCents: 52800 },
	});
});

test("wholesale under the minimum is refused", () => {
	const quote = quoteCart({
		accountSide: "wholesale",
		accountStatus: "active",
		orderSide: "wholesale",
		qty: 5,
	});
	expect(quote).toEqual({ ok: false, error: "moq" });
});
