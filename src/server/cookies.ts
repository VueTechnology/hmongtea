import { cartCount, parseCart, withQty, type CartLine } from "../domain/cart.ts";

export const SESSION_COOKIE = "__Host-hmongtea_session";
export const CSRF_COOKIE = "__Host-hmongtea_csrf";
export const CART_COOKIE = "__Host-hmongtea_cart";

const SESSION_AGE = 60 * 60 * 24 * 14;

export function cookieHeader(value: string, maxAge: number): string {
	return `${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function sessionCookie(token: string): string {
	return cookieHeader(`${SESSION_COOKIE}=${token}`, SESSION_AGE);
}

export function clearSessionCookie(): string {
	return cookieHeader(`${SESSION_COOKIE}=`, 0);
}

export function csrfCookie(token: string): string {
	return cookieHeader(`${CSRF_COOKIE}=${token}`, SESSION_AGE);
}

export function cartSetCookie(lines: readonly CartLine[]): string {
	const value = encodeURIComponent(JSON.stringify(lines));
	return cookieHeader(`${CART_COOKIE}=${value}`, SESSION_AGE);
}

export function parseCookieHeader(header: string | null): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!header) return cookies;
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim();
		cookies[key] = part.slice(eq + 1).trim();
	}
	return cookies;
}

export function readCart(header: string | null): CartLine[] {
	const raw = parseCookieHeader(header)[CART_COOKIE];
	return parseCart(raw);
}

export function countCart(header: string | null): number {
	return cartCount(readCart(header));
}

export function nextCart(header: string | null, qty: number): { lines: CartLine[]; cookie: string } {
	const lines = withQty(qty);
	return { lines, cookie: cartSetCookie(lines) };
}
