import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function newId(): string {
	return crypto.randomUUID();
}

export function newToken(): string {
	return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export function tokenEquals(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length || a.length === 0) return false;
	return timingSafeEqual(a, b);
}
