import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "#/db/schema";

export type Sql = ReturnType<typeof postgres>;

export function openDatabase(url: string, max = 4) {
	const sql = postgres(url, { max });
	const db = drizzle(sql, { schema });
	return {
		sql,
		db,
		close: async () => {
			await sql.end({ timeout: 5 });
		},
	};
}

export type Database = ReturnType<typeof openDatabase>["db"];

let singleton: ReturnType<typeof openDatabase> | null = null;

export function getDb(): Database {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL is required");
	if (!singleton) singleton = openDatabase(url);
	return singleton.db;
}
