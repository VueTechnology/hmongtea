import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;
let booted: Promise<void> | null = null;

export function databaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL is required.");
	return url;
}

export function getSql() {
	if (!client) client = postgres(databaseUrl(), { max: 8 });
	return client;
}

export function getDb() {
	if (!database) database = drizzle(getSql(), { schema });
	return database;
}

export async function closeDb() {
	if (client) await client.end({ timeout: 5 });
	client = null;
	database = null;
	booted = null;
}

export function boot(): Promise<void> {
	if (!booted) {
		booted = (async () => {
			const { migrate } = await import("./migrate.ts");
			const { ensureStaff } = await import("./auth.ts");
			await migrate(getSql());
			await ensureStaff();
		})();
	}
	return booted;
}
