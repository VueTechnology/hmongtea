export type AddressInput = {
	line1: string;
	line2: string;
	city: string;
	region: string;
	postal: string;
	country: string;
};

function clean(raw: unknown, max: number, min: number): string | null {
	if (typeof raw !== "string") return null;
	const value = raw.trim().replace(/\s+/g, " ");
	if (value.length < min || value.length > max) return null;
	if (/[\u0000-\u001f]/.test(value)) return null;
	return value;
}

export function parseEmail(raw: unknown): string | null {
	const email = clean(raw, 200, 3);
	if (!email) return null;
	const lower = email.toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return null;
	return lower;
}

export function parsePassword(raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	if (raw.length < 8 || raw.length > 200) return null;
	if (/[\u0000-\u001f]/.test(raw)) return null;
	return raw;
}

export function parseOptional(raw: unknown, max: number): string | null {
	if (raw == null) return "";
	if (typeof raw !== "string") return null;
	if (raw.trim() === "") return "";
	return clean(raw, max, 1);
}

export function parseRequired(raw: unknown, max: number): string | null {
	return clean(raw, max, 1);
}

export function parseAddress(input: {
	line1: unknown;
	line2: unknown;
	city: unknown;
	region: unknown;
	postal: unknown;
	country: unknown;
}): AddressInput | null {
	const line1 = parseRequired(input.line1, 200);
	const line2 = parseOptional(input.line2, 200);
	const city = parseRequired(input.city, 80);
	const region = parseRequired(input.region, 80);
	const postal = parseRequired(input.postal, 20);
	const country = parseRequired(input.country, 80);
	if (!line1 || line2 === null || !city || !region || !postal || !country) return null;
	return { line1, line2, city, region, postal, country };
}

export function parseQty(raw: unknown, min: number, max = 999): number | null {
	if (typeof raw === "number" && Number.isInteger(raw)) {
		return raw >= min && raw <= max ? raw : null;
	}
	if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) return null;
	const qty = Number(raw.trim());
	if (qty < min || qty > max) return null;
	return qty;
}

export function parseDollarsToCents(raw: unknown): number | null {
	if (typeof raw !== "string" || !/^\d+(\.\d{1,2})?$/.test(raw.trim())) return null;
	const [whole, fraction = ""] = raw.trim().split(".");
	const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
	if (!Number.isInteger(cents) || cents < 0 || cents > 100_000_000) return null;
	return cents;
}

export function parseDate(raw: unknown): string | null {
	if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
	const [year, month, day] = raw.split("-").map(Number);
	if (!year || !month || !day) return null;
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
	return raw;
}

export function parseAudience(raw: unknown): "preorder" | "updates" | null {
	if (raw === "preorder" || raw === "updates") return raw;
	return null;
}

export function parseSideFilter(raw: unknown): "" | "retail" | "wholesale" {
	if (raw === "retail" || raw === "wholesale") return raw;
	return "";
}

export function parseStatusFilter(raw: unknown): "" | "placed" | "shipped" | "cancelled" {
	if (raw === "placed" || raw === "shipped" || raw === "cancelled") return raw;
	return "";
}

export function parseAccountStatus(raw: unknown): "" | "active" | "pending" | "rejected" {
	if (raw === "active" || raw === "pending" || raw === "rejected") return raw;
	return "";
}

export function likePattern(raw: string): string {
	return `%${raw.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
