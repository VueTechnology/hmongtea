export class AppError extends Error {
	constructor(
		readonly code: "validation" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "rate_limit",
		message: string,
		readonly detail = "",
	) {
		super(message);
		this.name = "AppError";
	}
}

export function errorQuery(error: unknown): string {
	if (!(error instanceof AppError)) return "invalid";
	if (error.detail) return error.detail;
	if (error.code === "rate_limit") return "rate";
	if (error.code === "unauthorized") return "credentials";
	if (error.code === "forbidden") return "forbidden";
	if (error.code === "conflict") return "conflict";
	if (error.code === "not_found") return "invalid";
	return "invalid";
}
