import { expect, test } from "bun:test";
import { quoteOnBehalf, resetStillValid } from "#/domain/staff-desk";

test("a staff order for a customer uses the retail price", () => {
	const quote = quoteOnBehalf({ side: "retail", tier: null, qty: 2 });
	expect(quote.ok).toBe(true);
	if (!quote.ok) return;
	expect(quote.quote.unitCents).toBe(4494);
	expect(quote.quote.totalCents).toBe(8988);
	expect(quote.quote.side).toBe("retail");
});

test("a staff order for a partner uses that partner's tier", () => {
	const pallet = quoteOnBehalf({ side: "wholesale", tier: "pallet", qty: 12 });
	expect(pallet.ok).toBe(true);
	if (!pallet.ok) return;
	expect(pallet.quote.unitCents).toBe(2000);
	expect(pallet.quote.totalCents).toBe(24000);
	const contracted = quoteOnBehalf({
		side: "wholesale",
		tier: "case",
		qty: 48,
	});
	expect(contracted.ok).toBe(true);
	if (!contracted.ok) return;
	expect(contracted.quote.unitCents).toBe(2400);
});

test("a partner with no contracted tier pays the 12-pack price", () => {
	const quote = quoteOnBehalf({ side: "wholesale", tier: null, qty: 48 });
	expect(quote.ok).toBe(true);
	if (!quote.ok) return;
	expect(quote.quote.unitCents).toBe(2400);
	expect(quote.quote.totalCents).toBe(115200);
});

test("a partner order under 12 packs is refused", () => {
	expect(quoteOnBehalf({ side: "wholesale", tier: "case", qty: 11 })).toEqual({
		ok: false,
		error: "moq",
	});
});

test("a used or expired reset token is refused", () => {
	const now = new Date("2026-11-18T12:00:00.000Z");
	const later = new Date("2026-11-18T12:30:00.000Z");
	expect(resetStillValid(later, null, now)).toBe(true);
	expect(resetStillValid(now, null, now)).toBe(false);
	expect(resetStillValid(later, now, now)).toBe(false);
});
