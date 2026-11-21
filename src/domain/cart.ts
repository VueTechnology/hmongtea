import { MOQ, retailUnit, wholesaleUnit } from "#/domain/prices";
import {
	type PurchasePlan,
	parseRetailCartCookie,
} from "#/domain/purchase-plan";

export type CartSide = "retail" | "wholesale";

type QuoteBase = {
	qty: number;
	unitCents: number;
	totalCents: number;
};

export type RetailQuote = QuoteBase & {
	side: "retail";
	purchasePlan: PurchasePlan;
};

export type WholesaleQuote = QuoteBase & {
	side: "wholesale";
};

export type Quote = RetailQuote | WholesaleQuote;

export type QuoteError =
	| "qty"
	| "moq"
	| "retail-blocked"
	| "not-approved"
	| "rejected";

export function parseCartQty(raw: string | null | undefined): number {
	return parseRetailCartCookie(raw).qty;
}

export function quoteCart(
	input: {
		accountSide: CartSide;
		accountStatus: "active" | "pending" | "rejected";
		qty: number;
	} & (
		| { orderSide: "wholesale" }
		| { orderSide: "retail"; purchasePlan: PurchasePlan }
	),
): { ok: true; quote: Quote } | { ok: false; error: QuoteError } {
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
	if (input.orderSide === "retail") {
		const unit = retailUnit(input.qty, input.purchasePlan.kind);
		if (unit == null) return { ok: false, error: "qty" };
		return {
			ok: true,
			quote: {
				side: "retail",
				purchasePlan: input.purchasePlan,
				qty: input.qty,
				unitCents: unit,
				totalCents: unit * input.qty,
			},
		};
	}
	const unit = wholesaleUnit(input.qty);
	if (unit == null) return { ok: false, error: "qty" };
	return {
		ok: true,
		quote: {
			side: "wholesale",
			qty: input.qty,
			unitCents: unit,
			totalCents: unit * input.qty,
		},
	};
}
