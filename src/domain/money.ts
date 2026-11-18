export function formatUsd(cents: number): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatWhen(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	const text = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "America/Los_Angeles",
	}).format(date);
	return `${text} PT`;
}

export function percent(raisedCents: number, targetCents: number): number {
	if (targetCents <= 0) return 0;
	return Math.max(0, Math.min(100, Math.round((raisedCents / targetCents) * 100)));
}
