import { sql } from "drizzle-orm";
import type { Database } from "#/db/client";

export async function consumeRateLimit(
	db: Database,
	bucket: string,
	_max: number,
): Promise<number> {
	const rows = await db.execute<{ hits: number }>(sql`
		insert into rate_limits (bucket, hits, window_start)
		values (${bucket}, 1, now())
		on conflict (bucket) do update set
			hits = case
				when rate_limits.window_start < now() - interval '15 minutes' then 1
				else rate_limits.hits + 1
			end,
			window_start = case
				when rate_limits.window_start < now() - interval '15 minutes' then now()
				else rate_limits.window_start
			end
		returning hits
	`);
	const first = Array.isArray(rows) ? rows[0] : undefined;
	return Number(first?.hits ?? 0);
}
