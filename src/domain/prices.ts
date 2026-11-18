export const RETAIL_CENTS = 3200;
export const SUBSCRIPTION_CENTS = 3000;
export const NET_WEIGHT_LABEL = "4.4 oz (125 g)";
export const SHIP_WINDOW = "5 to 7 business days";

export const MOQ = 12;
export const WHOLESALE_TIERS = [
	{ minQty: 12, maxQty: 23, unitCents: 2400, label: "12 to 23 packs" },
	{ minQty: 24, maxQty: 47, unitCents: 2200, label: "24 to 47 packs" },
	{ minQty: 48, maxQty: null, unitCents: 2000, label: "48 or more packs" },
] as const;

export const MAX_QTY = 999;

export const PRODUCT_SKU = "KUABCHA-PACK";
export const PRODUCT_NAME = "KuabCha loose-leaf green tea";

export function wholesaleUnit(qty: number): number | null {
	if (!Number.isInteger(qty) || qty < MOQ || qty > MAX_QTY) return null;
	let unit: number = WHOLESALE_TIERS[0].unitCents;
	for (const tier of WHOLESALE_TIERS) {
		if (qty >= tier.minQty) unit = tier.unitCents;
	}
	return unit;
}

export function retailUnit(qty: number): number | null {
	if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
	return RETAIL_CENTS;
}
