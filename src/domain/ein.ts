export function parseEin(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const digits = value.trim().replace(/-/g, "");
	if (!/^\d{9}$/.test(digits)) return null;
	return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function maskEin(last4: string): string {
	const tail = last4.replace(/\D/g, "").slice(-4);
	return `••-•••${tail}`;
}
