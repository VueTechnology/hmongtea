import { MOQ, retailUnit, wholesaleUnit } from "#/domain/prices";

export type CartSide = "retail" | "wholesale";

export type Quote = {
	side: CartSide;
	qty: number;
	unitCents: number;
	totalCents: number;
};

export type QuoteError =
	| "qty"
	| "moq"
	| "retail-blocked"
	| "not-approved"
	| "rejected";

export function parseCartQty(raw: string | null | undefined): number {
	if (!raw) return 0;
	if (!/^\d{1,3}$/.test(raw)) return 0;
	const qty = Number(raw);
	if (qty > 999) return 0;
	return qty;
}

export function quoteCart(input: {
	accountSide: CartSide;
	accountStatus: "active" | "pending" | "rejected";
	orderSide: CartSide;
	qty: number;
}): { ok: true; quote: Quote } | { ok: false; error: QuoteError } {
	if (input.orderSide === "wholesale" && input.accountSide !== "wholesale") {
		return { ok: false, error: "retail-blocked" };
	}
	if (input.orderSide === "wholesale" && input.accountStatus === "pending") {
		return { ok: false, error: "not-approved" };
	}
	if (input.orderSide === "wholesale" && input.accountStatus === "rejected") {
		return { ok: false, error: "rejected" };
	}
	if (input.orderSide === "wholesale" && input.qty < MOQ) {
		return { ok: false, error: "moq" };
	}
	const unit =
		input.orderSide === "wholesale"
			? wholesaleUnit(input.qty)
			: retailUnit(input.qty);
	if (unit == null) return { ok: false, error: "qty" };
	return {
		ok: true,
		quote: {
			side: input.orderSide,
			qty: input.qty,
			unitCents: unit,
			totalCents: unit * input.qty,
		},
	};
}
