import { expect, test } from "bun:test";
import { cartCount, parseCart, withQty } from "./cart.ts";

test("cart keeps one KuabCha line and drops junk", () => {
	const raw = JSON.stringify([
		{ sku: "kuabcha", qty: 2 },
		{ sku: "other", qty: 4 },
		{ sku: "kuabcha", qty: 1.5 },
	]);
	const lines = parseCart(encodeURIComponent(raw));
	expect(lines).toEqual([{ sku: "kuabcha", qty: 2 }]);
	expect(cartCount(lines)).toBe(2);
	expect(withQty(0)).toEqual([]);
	expect(parseCart("nope")).toEqual([]);
});
