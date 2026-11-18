import { SKU } from "./prices.ts";

export type CartLine = { readonly sku: typeof SKU; readonly qty: number };

export function parseCart(raw: string | null | undefined): CartLine[] {
	if (!raw) return [];
	const parsed = parseJson(raw) ?? parseJson(safeDecode(raw));
	if (!Array.isArray(parsed)) return [];
	const lines: CartLine[] = [];
	for (const entry of parsed) {
		if (typeof entry !== "object" || entry === null) continue;
		if (!("sku" in entry) || !("qty" in entry)) continue;
		if (entry.sku !== SKU) continue;
		if (typeof entry.qty !== "number" || !Number.isInteger(entry.qty)) continue;
		if (entry.qty < 1 || entry.qty > 99) continue;
		lines.push({ sku: SKU, qty: entry.qty });
	}
	return lines.slice(0, 1);
}

export function cartCount(lines: readonly CartLine[]): number {
	return lines.reduce((sum, line) => sum + line.qty, 0);
}

export function withQty(qty: number): CartLine[] {
	if (!Number.isInteger(qty) || qty <= 0) return [];
	return [{ sku: SKU, qty: Math.min(qty, 99) }];
}

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function safeDecode(raw: string): string {
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}
