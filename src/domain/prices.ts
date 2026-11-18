// Shop schedule for one KuabCha pack.
export const RETAIL_CENTS = 3200;
export const MOQ = 12;
export const SKU = "kuabcha";
export const PRODUCT_NAME = "KuabCha loose-leaf green tea";

export const TIERS = [
	{ minQty: 12, maxQty: 23, unitCents: 2400, label: "12 to 23 packs" },
	{ minQty: 24, maxQty: 47, unitCents: 2200, label: "24 to 47 packs" },
	{ minQty: 48, maxQty: null, unitCents: 2000, label: "48 or more packs" },
] as const;

export type Side = "retail" | "wholesale";

export type Quote = {
	side: Side;
	qty: number;
	unitCents: number;
	totalCents: number;
	tierLabel: string;
};

export function wholesaleTier(qty: number) {
	return TIERS.find((tier) => qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) ?? null;
}

export function quote(side: Side, qty: number): Quote | null {
	if (!Number.isInteger(qty) || qty < 1 || qty > 999) return null;
	if (side === "retail") {
		return { side, qty, unitCents: RETAIL_CENTS, totalCents: RETAIL_CENTS * qty, tierLabel: "Retail pack" };
	}
	const tier = wholesaleTier(qty);
	if (!tier) return null;
	return { side, qty, unitCents: tier.unitCents, totalCents: tier.unitCents * qty, tierLabel: tier.label };
}

export type PriceBook = {
	side: Side;
	orderable: boolean;
	unitCents: number | null;
	tiers: typeof TIERS | null;
};

export function priceBook(account: { accountType: Side; status: string }): PriceBook {
	if (account.accountType === "retail") {
		return { side: "retail", orderable: account.status === "active", unitCents: RETAIL_CENTS, tiers: null };
	}
	if (account.status !== "active") {
		return { side: "wholesale", orderable: false, unitCents: null, tiers: null };
	}
	return { side: "wholesale", orderable: true, unitCents: null, tiers: TIERS };
}
