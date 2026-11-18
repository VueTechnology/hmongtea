import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Sql } from "#/db/client";

function statements(sqlText: string): string[] {
	return sqlText
		.split(/;\s*\n/)
		.map((part) => part.trim())
		.filter(
			(part) =>
				part.length > 0 &&
				!part
					.split("\n")
					.every((line) => line.trim().startsWith("--") || line.trim() === ""),
		);
}

export async function migrate(
	sql: Sql,
	folder = join(import.meta.dir, "../../drizzle"),
): Promise<void> {
	await sql.unsafe(`create table if not exists schema_migrations (
		version text primary key,
		applied_at timestamptz not null default now()
	)`);
	const files = (await readdir(folder))
		.filter((name) => name.endsWith(".sql"))
		.sort();
	for (const file of files) {
		const applied = await sql<
			{ version: string }[]
		>`select version from schema_migrations where version = ${file}`;
		if (applied.length > 0) continue;
		const body = await readFile(join(folder, file), "utf8");
		await sql.begin(async (tx) => {
			for (const statement of statements(body)) {
				await tx.unsafe(statement);
			}
			await tx`insert into schema_migrations (version) values (${file})`;
		});
	}
}
