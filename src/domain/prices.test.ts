import { describe, expect, test } from "bun:test";
import { MOQ, priceBook, quote, RETAIL_CENTS } from "./prices.ts";

describe("prices", () => {
	test("retail stays on the retail pack price at wholesale quantities", () => {
		const priced = quote("retail", MOQ);
		expect(priced?.unitCents).toBe(RETAIL_CENTS);
		expect(priced?.totalCents).toBe(RETAIL_CENTS * MOQ);
		expect(priced?.tierLabel).toBe("Retail pack");
	});

	test("wholesale tiers and the minimum", () => {
		expect(quote("wholesale", 11)).toBeNull();
		expect(quote("wholesale", 12)?.unitCents).toBe(2400);
		expect(quote("wholesale", 24)?.unitCents).toBe(2200);
		expect(quote("wholesale", 48)?.unitCents).toBe(2000);
		expect(quote("wholesale", 48)?.totalCents).toBe(96000);
	});

	test("a retail account does not receive wholesale tiers", () => {
		const book = priceBook({ accountType: "retail", status: "active" });
		expect(book.tiers).toBeNull();
		expect(book.unitCents).toBe(RETAIL_CENTS);
		expect(book.orderable).toBe(true);
	});

	test("a pending wholesale account cannot order", () => {
		const book = priceBook({ accountType: "wholesale", status: "pending" });
		expect(book.orderable).toBe(false);
		expect(book.tiers).toBeNull();
	});

	test("an approved wholesale account sees tiers", () => {
		const book = priceBook({ accountType: "wholesale", status: "active" });
		expect(book.orderable).toBe(true);
		expect(book.tiers?.length).toBe(3);
	});
});
