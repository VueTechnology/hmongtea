const KEYS = ["error", "sent", "saved", "placed", "shipped", "cancelled", "deleted", "paid"] as const;

export type NoteSearch = Partial<Record<(typeof KEYS)[number], string>>;

export function noteSearch(search: Record<string, unknown>): NoteSearch {
	const result: NoteSearch = {};
	for (const key of KEYS) {
		const value = search[key];
		if (typeof value === "string" && value.length > 0 && value.length < 40) result[key] = value;
	}
	return result;
}
