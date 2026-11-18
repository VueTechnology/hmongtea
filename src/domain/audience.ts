export type RecipientStatus = "sent" | "skipped_unsubscribed" | "skipped_pending";

export type RecipientPick = { email: string; status: RecipientStatus };

export function chooseRecipients(input: {
	audience: "preorder" | "updates";
	signups: { email: string; status: "pending" | "confirmed" | "unsubscribed" }[];
	preorders: { email: string; optOut: boolean }[];
	optedOut: readonly string[];
}): RecipientPick[] {
	const opted = new Set(input.optedOut.map((email) => email.toLowerCase()));
	if (input.audience === "updates") {
		const seen = new Set<string>();
		const picks: RecipientPick[] = [];
		for (const signup of input.signups) {
			const email = signup.email.toLowerCase();
			if (seen.has(email)) continue;
			seen.add(email);
			if (signup.status === "unsubscribed" || opted.has(email)) picks.push({ email, status: "skipped_unsubscribed" });
			else if (signup.status === "pending") picks.push({ email, status: "skipped_pending" });
			else picks.push({ email, status: "sent" });
		}
		return picks.sort((a, b) => a.email.localeCompare(b.email));
	}
	const seen = new Set<string>();
	const picks: RecipientPick[] = [];
	for (const row of input.preorders) {
		const email = row.email.toLowerCase();
		if (seen.has(email)) continue;
		seen.add(email);
		picks.push({ email, status: row.optOut || opted.has(email) ? "skipped_unsubscribed" : "sent" });
	}
	return picks.sort((a, b) => a.email.localeCompare(b.email));
}
