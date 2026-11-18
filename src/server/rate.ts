import { getSql } from "./db.ts";
import { AppError } from "./errors.ts";

export const LOGIN_LIMIT = 8;
export const SIGNUP_LIMIT = 5;

export async function hitLimit(bucket: string, limit: number) {
	const sql = getSql();
	const rows = await sql<{ count: number }[]>`
		insert into rate_limits (bucket, window_start, count)
		values (
			${bucket},
			to_timestamp(floor(extract(epoch from now()) / 900) * 900),
			1
		)
		on conflict (bucket, window_start)
		do update set count = rate_limits.count + 1
		returning count
	`;
	if ((rows[0]?.count ?? 1) > limit) throw new AppError("rate_limit", "Too many attempts.", "rate");
}
