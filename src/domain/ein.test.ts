import { expect, test } from "bun:test";
import { maskEin, parseEin } from "#/domain/ein";

test("an EIN is nine digits, with or without the hyphen", () => {
	expect(parseEin("12-3456789")).toBe("12-3456789");
	expect(parseEin("123456789")).toBe("12-3456789");
	expect(parseEin("12-345678")).toBeNull();
	expect(parseEin("ab-3456789")).toBeNull();
});

test("a masked EIN shows the last four digits", () => {
	expect(maskEin("6789")).toBe("••-•••6789");
});
