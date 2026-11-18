export type AddressInput = {
	line1: string;
	line2: string;
	city: string;
	region: string;
	postalCode: string;
	country: string;
	phone: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	if (email.length < 3 || email.length > 254) return null;
	if (!EMAIL.test(email)) return null;
	return email;
}

export function parsePassword(value: unknown): string | null {
	if (typeof value !== "string") return null;
	if (value.length < 12 || value.length > 200) return null;
	if (value.trim().length === 0) return null;
	return value;
}

export function parseName(value: unknown, required: boolean): string | null {
	if (typeof value !== "string") return required ? null : "";
	const name = value.trim().replace(/\s+/g, " ");
	if (name.length === 0) return required ? null : "";
	if (name.length > 120) return null;
	return name;
}

export function parsePhone(value: unknown, required: boolean): string | null {
	if (typeof value !== "string") return required ? null : "";
	const phone = value.trim();
	if (phone.length === 0) return required ? null : "";
	if (phone.length > 40) return null;
	if (!/^[0-9+().\-\s]+$/.test(phone)) return null;
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 7) return null;
	return phone;
}

export function parseText(
	value: unknown,
	max: number,
	required: boolean,
): string | null {
	if (typeof value !== "string") return required ? null : "";
	const text = value.trim().replace(/\s+/g, " ");
	if (text.length === 0) return required ? null : "";
	if (text.length > max) return null;
	return text;
}

export function parseWebsite(value: unknown): string | null {
	if (typeof value !== "string") return "";
	const site = value.trim();
	if (site.length === 0) return "";
	if (site.length > 200) return null;
	let url: URL;
	try {
		url = new URL(site);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	return site;
}

export function parseAddress(
	input: Record<string, unknown>,
): AddressInput | null {
	const line1 = parseText(input.line1, 120, true);
	const line2 = parseText(input.line2, 120, false);
	const city = parseText(input.city, 80, true);
	const region = parseText(input.region, 40, true);
	const countryRaw =
		typeof input.country === "string"
			? input.country.trim().toUpperCase()
			: "US";
	const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null;
	const postalRaw =
		typeof input.postalCode === "string" ? input.postalCode.trim() : "";
	const postalCode = /^[A-Za-z0-9 -]{3,12}$/.test(postalRaw) ? postalRaw : null;
	const phone = parsePhone(input.phone, false);
	if (
		!line1 ||
		line2 == null ||
		!city ||
		!region ||
		!country ||
		!postalCode ||
		phone == null
	)
		return null;
	return { line1, line2, city, region, postalCode, country, phone };
}

export function parseDate(value: unknown): string | null {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return null;
	const [year, month, day] = value.split("-").map(Number);
	if (year == null || month == null || day == null) return null;
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}
	return value;
}

export function parseTracking(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const tracking = value.trim();
	if (tracking.length < 1 || tracking.length > 80) return null;
	if (/[\r\n]/.test(tracking)) return null;
	return tracking;
}

export function parseQty(value: unknown): number | null {
	const raw = typeof value === "number" ? String(value) : value;
	if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw.trim())) return null;
	const qty = Number(raw);
	if (!Number.isInteger(qty) || qty < 0 || qty > 999) return null;
	return qty;
}

export function parseDollarsToCents(value: unknown): number | null {
	if (typeof value !== "string" || !/^\d{1,9}$/.test(value.trim())) return null;
	const dollars = Number(value.trim());
	if (!Number.isInteger(dollars) || dollars < 0 || dollars > 10_000_000)
		return null;
	return dollars * 100;
}
