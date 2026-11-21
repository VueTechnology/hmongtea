export const DEFAULT_SUBSCRIPTION_INTERVAL_WEEKS = 4;
export const MIN_SUBSCRIPTION_INTERVAL_WEEKS = 1;
export const MAX_SUBSCRIPTION_INTERVAL_WEEKS = 52;

export type PlanKind = "one-time" | "subscription";

export type PurchasePlan =
	| { kind: "one-time" }
	| { kind: "subscription"; intervalWeeks: number };

export type RetailCart = {
	qty: number;
	planKind: PlanKind;
};

export type SubscriptionAction =
	| { kind: "skip" }
	| { kind: "change-interval"; intervalWeeks: number }
	| { kind: "cancel" };

export function parsePlanKind(value: unknown): PlanKind | null {
	return value === "one-time" || value === "subscription" ? value : null;
}

export function parseIntervalWeeks(value: unknown): number | null {
	const raw = typeof value === "number" ? String(value) : value;
	if (typeof raw !== "string" || !/^\d{1,2}$/.test(raw.trim())) return null;
	const weeks = Number(raw);
	if (
		weeks < MIN_SUBSCRIPTION_INTERVAL_WEEKS ||
		weeks > MAX_SUBSCRIPTION_INTERVAL_WEEKS
	)
		return null;
	return weeks;
}

export function makePurchasePlan(
	kind: PlanKind,
	intervalWeeks = DEFAULT_SUBSCRIPTION_INTERVAL_WEEKS,
): PurchasePlan {
	return kind === "subscription" ? { kind, intervalWeeks } : { kind };
}

export function parseRetailCartCookie(
	raw: string | null | undefined,
): RetailCart {
	if (!raw) return { qty: 0, planKind: "one-time" };
	const separator = raw.indexOf(":");
	const planText = separator < 0 ? "one-time" : raw.slice(0, separator);
	const qtyText = separator < 0 ? raw : raw.slice(separator + 1);
	const planKind = parsePlanKind(planText);
	if (!planKind || !/^\d{1,3}$/.test(qtyText)) {
		return { qty: 0, planKind: "one-time" };
	}
	const qty = Number(qtyText);
	if (qty > 999) return { qty: 0, planKind: "one-time" };
	return { qty, planKind };
}

export function serializeRetailCartCookie(cart: RetailCart): string {
	return `${cart.planKind}:${cart.qty}`;
}

export function dateAfterWeeks(from: Date, weeks: number): string {
	const date = new Date(from);
	date.setUTCDate(date.getUTCDate() + weeks * 7);
	return date.toISOString().slice(0, 10);
}

export function dateStringAfterWeeks(from: string, weeks: number): string {
	return dateAfterWeeks(new Date(`${from}T00:00:00.000Z`), weeks);
}
