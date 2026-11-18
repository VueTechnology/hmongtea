import { expect, test } from "bun:test";
import {
	CART_COOKIE,
	CSRF_COOKIE,
	csrfCookie,
	SESSION_COOKIE,
	sessionCookie,
} from "#/server/cookies";

test("session, csrf, and cart cookies use the __Host- prefix", () => {
	expect(SESSION_COOKIE).toBe("__Host-hmongtea_session");
	expect(CSRF_COOKIE).toBe("__Host-hmongtea_csrf");
	expect(CART_COOKIE).toBe("__Host-hmongtea_cart");
	const header = sessionCookie("abc");
	expect(header.startsWith("__Host-hmongtea_session=abc;")).toBe(true);
	expect(header).toContain("HttpOnly");
	expect(header).toContain("Secure");
	expect(header).toContain("Path=/");
	expect(header).not.toContain("Domain=");
	expect(csrfCookie("abc")).toContain("__Host-hmongtea_csrf=");
});
