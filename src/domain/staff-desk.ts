import type { Quote } from "#/domain/cart";
import {
	MAX_QTY,
	MOQ,
	type PartnerTierId,
	partnerTierCents,
	retailUnit,
} from "#/domain/prices";

export const RESET_WINDOW_MS = 30 * 60 * 1000;

export function quoteOnBehalf(input: {
	side: "retail" | "wholesale";
	tier: PartnerTierId | null;
	qty: number;
}): { ok: true; quote: Quote } | { ok: false; error: "qty" | "moq" } {
	if (input.side === "retail") {
		const unit = retailUnit(input.qty);
		if (unit == null) return { ok: false, error: "qty" };
		return {
			ok: true,
			quote: {
				side: "retail",
				purchasePlan: { kind: "one-time" },
				qty: input.qty,
				unitCents: unit,
				totalCents: unit * input.qty,
			},
		};
	}
	if (!Number.isInteger(input.qty) || input.qty > MAX_QTY)
		return { ok: false, error: "qty" };
	if (input.qty < MOQ) return { ok: false, error: "moq" };
	const unit = input.tier
		? partnerTierCents(input.tier)
		: partnerTierCents("case");
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

export function resetExpiry(now: Date): Date {
	return new Date(now.getTime() + RESET_WINDOW_MS);
}

export function resetStillValid(
	expiresAt: Date,
	usedAt: Date | null,
	now: Date,
): boolean {
	return usedAt == null && expiresAt.getTime() > now.getTime();
}

export function passwordMail(input: {
	origin: string;
	token: string;
	purpose: "set" | "reset";
}): { subject: string; body: string } {
	const subject =
		input.purpose === "set"
			? "Set your hmongtea.com password"
			: "Reset your hmongtea.com password";
	const lead =
		input.purpose === "set"
			? "A staff member created an hmongtea.com account for you."
			: "A password reset was requested for this hmongtea.com account.";
	return {
		subject,
		body: `${lead}\n\nThis link works once and expires in 30 minutes.\n\n${input.origin}/reset?token=${input.token}\n`,
	};
}
