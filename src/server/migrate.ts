import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type postgres from "postgres";

function statements(sqlText: string): string[] {
	return sqlText
		.split("\n")
		.filter((line) => !line.trim().startsWith("--"))
		.join("\n")
		.split(";")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export function migrationDir(): string {
	return process.env.MIGRATIONS_DIR ?? join(process.cwd(), "drizzle");
}

export async function migrate(sql: ReturnType<typeof postgres>) {
	await sql`
		create table if not exists schema_migrations (
			version text primary key,
			applied_at timestamptz not null default now()
		)
	`;
	const files = (await readdir(migrationDir())).filter((file) => file.endsWith(".sql")).sort();
	const applied = await sql<{ version: string }[]>`select version from schema_migrations`;
	const have = new Set(applied.map((row) => row.version));
	for (const file of files) {
		const version = file.replace(/\.sql$/, "");
		if (have.has(version)) continue;
		const text = await readFile(join(migrationDir(), file), "utf8");
		await sql.begin(async (tx) => {
			for (const statement of statements(text)) await tx.unsafe(statement);
			await tx`insert into schema_migrations (version) values (${version})`;
		});
	}
}
