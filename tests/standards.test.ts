import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

function files(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === ".output" || entry.name === ".git") continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) files(path, out);
		else out.push(path);
	}
	return out;
}

test("versions, container user, and copy stay inside the rules", () => {
	const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
		dependencies: Record<string, string>;
		devDependencies: Record<string, string>;
	};
	for (const section of [pkg.dependencies, pkg.devDependencies]) {
		for (const version of Object.values(section)) {
			expect(version.startsWith("^") || version.startsWith("~")).toBe(false);
		}
	}
	expect(pkg.dependencies.nitro).toBe("3.0.261103-rc");
	expect(pkg.dependencies.resend).toBe("6.38.1");
	const docker = readFileSync(join(root, "Dockerfile"), "utf8");
	expect(docker).toContain("USER bun");
	expect(docker).toContain("chown -R bun:bun /app /data");
	expect(readFileSync(join(root, "docker-compose.yml"), "utf8")).toContain("postgres:18.7");
	const mail = readFileSync(join(root, "src/server/mail.ts"), "utf8");
	expect(mail).toContain('import { Resend } from "resend"');
	expect(mail.includes("import type")).toBe(false);
	expect(readFileSync(join(root, "src/server/stripe.ts"), "utf8")).toContain("constructEventAsync");
	const cookies = readFileSync(join(root, "src/server/cookies.ts"), "utf8");
	expect(cookies).toContain("HttpOnly");
	expect(cookies).toContain("Secure");
	expect(cookies).toContain("__Host-");
	expect(readFileSync(join(root, "src/server/passwords.ts"), "utf8")).toContain("argon2id");
	const source = files(join(root, "src"))
		.filter((path) => path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".css") || path.endsWith(".sql"))
		.map((path) => readFileSync(path, "utf8"))
		.join("\n")
		.toLowerCase();
	expect(source.includes("pheng")).toBe(false);
	expect(source.includes("niamtxojhmoo")).toBe(false);
	const example = readFileSync(join(root, ".env.example"), "utf8");
	expect(example.includes("sk_live_")).toBe(false);
	expect(example.includes("STAFF_PASSWORD=")).toBe(true);
	expect(readFileSync(join(root, "src/server/auth.ts"), "utf8").includes("STAFF_PASSWORD")).toBe(true);
});
