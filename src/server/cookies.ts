export const SESSION_COOKIE = "__Host-hmongtea_session";
export const CSRF_COOKIE = "__Host-hmongtea_csrf";
export const CART_COOKIE = "__Host-hmongtea_cart";

export const SESSION_COOKIE_HTTP = "hmongtea_session";
export const CSRF_COOKIE_HTTP = "hmongtea_csrf";
export const CART_COOKIE_HTTP = "hmongtea_cart";

const TWO_WEEKS = 60 * 60 * 24 * 14;

export function cookieIsSecure(
	request?: Request | null,
	source: NodeJS.ProcessEnv = process.env,
): boolean {
	const flag = (source.COOKIE_SECURE ?? "").trim().toLowerCase();
	if (flag === "true" || flag === "1" || flag === "yes") return true;
	if (!request) return false;
	const forwarded = request.headers.get("x-forwarded-proto");
	if (forwarded) {
		const proto = forwarded.split(",")[0]?.trim().toLowerCase();
		if (proto === "https") return true;
		if (proto === "http") return false;
	}
	try {
		return new URL(request.url).protocol === "https:";
	} catch {
		return false;
	}
}

export function sessionCookieName(secure: boolean): string {
	return secure ? SESSION_COOKIE : SESSION_COOKIE_HTTP;
}

export function csrfCookieName(secure: boolean): string {
	return secure ? CSRF_COOKIE : CSRF_COOKIE_HTTP;
}

export function cartCookieName(secure: boolean): string {
	return secure ? CART_COOKIE : CART_COOKIE_HTTP;
}

function cookie(
	name: string,
	value: string,
	maxAge: number,
	secure: boolean,
): string {
	const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly"];
	if (secure) parts.push("Secure");
	parts.push("SameSite=Lax", `Max-Age=${maxAge}`);
	return parts.join("; ");
}

export function sessionCookie(token: string, request?: Request | null): string {
	const secure = cookieIsSecure(request);
	return cookie(sessionCookieName(secure), token, TWO_WEEKS, secure);
}

export function clearSessionCookie(request?: Request | null): string {
	const secure = cookieIsSecure(request);
	return cookie(sessionCookieName(secure), "", 0, secure);
}

export function clearSessionCookies(): string[] {
	return [
		cookie(SESSION_COOKIE, "", 0, true),
		cookie(SESSION_COOKIE_HTTP, "", 0, false),
	];
}

export function csrfCookie(token: string, request?: Request | null): string {
	const secure = cookieIsSecure(request);
	return cookie(csrfCookieName(secure), token, TWO_WEEKS, secure);
}

export function cartCookie(qty: number, request?: Request | null): string {
	const secure = cookieIsSecure(request);
	return cookie(cartCookieName(secure), String(qty), TWO_WEEKS, secure);
}

export function clearCartCookie(request?: Request | null): string {
	const secure = cookieIsSecure(request);
	return cookie(cartCookieName(secure), "", 0, secure);
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

function firstCookie(header: string | null, ...names: string[]): string | null {
	for (const name of names) {
		const value = readCookie(header, name);
		if (value) return value;
	}
	return null;
}

export function readSessionToken(header: string | null): string | null {
	return firstCookie(header, SESSION_COOKIE, SESSION_COOKIE_HTTP);
}

export function readCsrfToken(header: string | null): string | null {
	return firstCookie(header, CSRF_COOKIE, CSRF_COOKIE_HTTP);
}

export function readCartCookie(header: string | null): string | null {
	return firstCookie(header, CART_COOKIE, CART_COOKIE_HTTP);
}
