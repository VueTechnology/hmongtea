import type { PlanKind } from "#/domain/purchase-plan";

export const RETAIL_CENTS = 4494;
export const SUBSCRIPTION_CENTS = 3994;
export const NET_WEIGHT_LABEL = "4.4 oz (125 g)";
export const SHIP_WINDOW = "5 to 7 business days";

export const MOQ = 12;
export const WHOLESALE_TIERS = [
	{ minQty: 12, maxQty: 23, unitCents: 2400, label: "12 to 23 packs" },
	{ minQty: 24, maxQty: 47, unitCents: 2200, label: "24 to 47 packs" },
	{ minQty: 48, maxQty: null, unitCents: 2000, label: "48 or more packs" },
] as const;

export const PARTNER_TIERS = [
	{
		id: "case",
		unitCents: WHOLESALE_TIERS[0].unitCents,
		label: WHOLESALE_TIERS[0].label,
	},
	{
		id: "half",
		unitCents: WHOLESALE_TIERS[1].unitCents,
		label: WHOLESALE_TIERS[1].label,
	},
	{
		id: "pallet",
		unitCents: WHOLESALE_TIERS[2].unitCents,
		label: WHOLESALE_TIERS[2].label,
	},
] as const;

export type PartnerTierId = (typeof PARTNER_TIERS)[number]["id"];

export function parsePartnerTier(value: unknown): PartnerTierId | null {
	if (value === "case" || value === "half" || value === "pallet") return value;
	return null;
}

export function partnerTierCents(id: PartnerTierId): number {
	const tier = PARTNER_TIERS.find((item) => item.id === id);
	if (!tier) throw new Error("Unknown partner tier");
	return tier.unitCents;
}

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

export function planUnitCents(planKind: PlanKind): number {
	return planKind === "subscription" ? SUBSCRIPTION_CENTS : RETAIL_CENTS;
}

export function retailUnit(
	qty: number,
	planKind: PlanKind = "one-time",
): number | null {
	if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
	return planUnitCents(planKind);
}
