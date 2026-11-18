export function normalizeEin(raw: string): string | null {
	const trimmed = raw.trim();
	if (!/^\d{2}-?\d{7}$/.test(trimmed)) return null;
	const digits = trimmed.replace("-", "");
	if (digits === "000000000") return null;
	return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function maskEin(ein: string): string {
	return `••-•••${ein.slice(-4)}`;
}
