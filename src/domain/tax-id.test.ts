import { expect, test } from "bun:test";
import { maskEin, normalizeEin } from "./tax-id.ts";

test("tax ID format and mask", () => {
	expect(normalizeEin("12-3456789")).toBe("12-3456789");
	expect(normalizeEin("123456789")).toBe("12-3456789");
	expect(normalizeEin("12-345678")).toBeNull();
	expect(normalizeEin("AB-1234567")).toBeNull();
	expect(normalizeEin("00-0000000")).toBeNull();
	expect(maskEin("12-3456789")).toBe("••-•••6789");
	expect(maskEin("12-3456789")).not.toContain("12345");
});
