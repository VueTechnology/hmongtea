export type Portal = "customer" | "partner" | "staff";

export function portalOf(account: {
	role: string;
	side: string;
}): Portal | null {
	if (account.role === "staff") return "staff";
	if (account.role === "customer" && account.side === "wholesale")
		return "partner";
	if (account.role === "customer" && account.side === "retail")
		return "customer";
	return null;
}

export function portalHome(portal: Portal): string {
	if (portal === "staff") return "/staff";
	if (portal === "partner") return "/wholesale/desk";
	return "/account";
}
