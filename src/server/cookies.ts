export const SESSION_COOKIE = "__Host-hmongtea_session";
export const CSRF_COOKIE = "__Host-hmongtea_csrf";
export const CART_COOKIE = "__Host-hmongtea_cart";

const TWO_WEEKS = 60 * 60 * 24 * 14;

function cookie(name: string, value: string, maxAge: number): string {
	return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function sessionCookie(token: string): string {
	return cookie(SESSION_COOKIE, token, TWO_WEEKS);
}

export function clearSessionCookie(): string {
	return cookie(SESSION_COOKIE, "", 0);
}

export function csrfCookie(token: string): string {
	return cookie(CSRF_COOKIE, token, TWO_WEEKS);
}

export function cartCookie(qty: number): string {
	return cookie(CART_COOKIE, String(qty), TWO_WEEKS);
}

export function clearCartCookie(): string {
	return cookie(CART_COOKIE, "", 0);
}

export function readCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq < 0) continue;
		if (part.slice(0, eq).trim() !== name) continue;
		try {
			return decodeURIComponent(part.slice(eq + 1).trim());
		} catch {
			return null;
		}
	}
	return null;
}
