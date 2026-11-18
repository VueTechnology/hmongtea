export type Notes = {
	error?: string;
	saved?: string;
	joined?: string;
	sent?: string;
	cancelled?: string;
	shipped?: string;
	deleted?: string;
	reset?: string;
	q?: string;
	side?: string;
	status?: string;
};

export function noteSearch(search: Record<string, unknown>): Notes {
	const notes: Notes = {};
	const text = (key: keyof Notes, value: unknown, max = 40) => {
		const raw =
			typeof value === "number" && Number.isFinite(value)
				? String(value)
				: value;
		if (typeof raw === "string" && raw.length > 0)
			notes[key] = raw.slice(0, max);
	};
	const flag = (key: keyof Notes, value: unknown) => {
		if (value === "1" || value === 1) notes[key] = "1";
	};
	text("error", search.error);
	flag("saved", search.saved);
	text("joined", search.joined, 20);
	text("sent", search.sent, 20);
	flag("cancelled", search.cancelled);
	flag("shipped", search.shipped);
	flag("deleted", search.deleted);
	flag("reset", search.reset);
	text("q", search.q, 120);
	text("side", search.side, 20);
	text("status", search.status, 20);
	return notes;
}
