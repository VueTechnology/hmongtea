import { expect, test } from "bun:test";
import { Resend } from "resend";

test("Resend loads as the SDK constructor", () => {
	expect(typeof Resend).toBe("function");
});
