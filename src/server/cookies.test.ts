import { expect, test } from "bun:test";
import {
	CART_COOKIE,
	CSRF_COOKIE,
	cookieIsSecure,
	csrfCookie,
	SESSION_COOKIE,
	sessionCookie,
} from "#/server/cookies";

test("session, csrf, and cart cookies use the __Host- prefix when Secure", () => {
	const request = new Request("https://hmongtea.example/login");
	expect(SESSION_COOKIE).toBe("__Host-hmongtea_session");
	expect(CSRF_COOKIE).toBe("__Host-hmongtea_csrf");
	expect(CART_COOKIE).toBe("__Host-hmongtea_cart");
	const header = sessionCookie("abc", request);
	expect(header.startsWith("__Host-hmongtea_session=abc;")).toBe(true);
	expect(header).toContain("HttpOnly");
	expect(header).toContain("Secure");
	expect(header).toContain("Path=/");
	expect(header).not.toContain("Domain=");
	expect(csrfCookie("abc", request)).toContain("__Host-hmongtea_csrf=");
});

test("cookies omit Secure and the __Host- prefix over plain http", () => {
	const request = new Request("http://grokbots-ubuntu-desktop-0009:3299/login");
	expect(cookieIsSecure(request)).toBe(false);
	const header = sessionCookie("abc", request);
	expect(header.startsWith("hmongtea_session=abc;")).toBe(true);
	expect(header).toContain("HttpOnly");
	expect(header).toContain("SameSite=Lax");
	expect(header).toContain("Path=/");
	expect(header).not.toMatch(/;\s*Secure(?:;|$)/);
	expect(header).not.toContain("__Host-");
	expect(csrfCookie("abc", request)).toContain("hmongtea_csrf=");
	expect(csrfCookie("abc", request)).not.toContain("__Host-");
});

test("X-Forwarded-Proto https and COOKIE_SECURE force Secure cookies", () => {
	const forwarded = new Request("http://127.0.0.1:3299/login", {
		headers: { "x-forwarded-proto": "https, http" },
	});
	expect(cookieIsSecure(forwarded)).toBe(true);
	expect(sessionCookie("abc", forwarded)).toContain("Secure");
	expect(sessionCookie("abc", forwarded)).toContain("__Host-hmongtea_session=");

	const httpReq = new Request("http://127.0.0.1:3299/login");
	expect(cookieIsSecure(httpReq)).toBe(false);
	const previous = process.env.COOKIE_SECURE;
	process.env.COOKIE_SECURE = "true";
	try {
		expect(cookieIsSecure(httpReq)).toBe(true);
		const header = sessionCookie("abc", httpReq);
		expect(header).toContain("Secure");
		expect(header).toContain("__Host-hmongtea_session=");
	} finally {
		if (previous === undefined) delete process.env.COOKIE_SECURE;
		else process.env.COOKIE_SECURE = previous;
	}
});
