import { spawn } from "node:child_process";
import { openDatabase } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { readEnv } from "../src/server/env";
import { ensurePortalAccounts, ensureStaff } from "../src/server/store";

const env = readEnv();
if (!env.databaseUrl) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}
const opened = openDatabase(env.databaseUrl);
await migrate(opened.sql);
const staff = await ensureStaff(opened.db, env);
await ensurePortalAccounts(opened.db, env);
await opened.close();
if (!staff.created && env.staffPassword.length < 12) {
	console.error(
		"Staff login is off. Set STAFF_EMAIL and a STAFF_PASSWORD of 12 or more characters.",
	);
}
console.log("hmongtea.com schema is ready");

const child = spawn("bun", [".output/server/index.mjs"], {
	stdio: "inherit",
	env: process.env,
});
for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
