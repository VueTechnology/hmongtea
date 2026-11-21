import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const sourcePath = join(root, "tokens.json");
const outputPath = join(root, "src/tokens.css");

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kebab(value: string): string {
	return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

const source: unknown = JSON.parse(await readFile(sourcePath, "utf8"));
if (!isRecord(source)) throw new Error("tokens.json must contain an object");

function at(path: string[]): unknown {
	let current: unknown = source;
	for (const key of path) {
		if (!isRecord(current)) return undefined;
		current = current[key];
	}
	return current;
}

function resolved(value: string): string {
	const match = value.match(/^\{([^}]+)\}$/);
	if (!match?.[1]) return value;
	const path = match[1].split(".");
	const target = at(path);
	if (!isRecord(target) || typeof target.$value !== "string") {
		throw new Error(`Unknown token alias ${match[1]}`);
	}
	return resolved(target.$value);
}

type Token = { path: string[]; value: string };
const tokens: Token[] = [];

function walk(value: unknown, path: string[]): void {
	if (!isRecord(value)) return;
	if (typeof value.$value === "string") {
		tokens.push({ path, value: resolved(value.$value) });
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		if (!key.startsWith("$")) walk(child, [...path, key]);
	}
}

walk(source, []);
const semantic = tokens.filter((token) => token.path[0] === "semantic");
const components = tokens.filter((token) => token.path[0] === "component");
const theme = semantic.filter(
	(token) => token.path[1] === "color" || token.path[1] === "font",
);
const variables = [...semantic, ...components].filter(
	(token) => token.path[1] !== "color" && token.path[1] !== "font",
);

function name(path: string[]): string {
	return path.slice(1).map(kebab).join("-");
}

const css = [
	"@theme {",
	...theme.map((token) => `\t--${name(token.path)}: ${token.value};`),
	"}",
	"",
	":root {",
	...variables.map((token) => `\t--${name(token.path)}: ${token.value};`),
	"}",
	"",
].join("\n");

if (process.argv.includes("--check")) {
	const current = await readFile(outputPath, "utf8").catch(() => "");
	if (current !== css) throw new Error("Run bun scripts/build-tokens.ts");
	const styles = await readFile(join(root, "src/styles.css"), "utf8");
	if (/(#[0-9a-f]{3,8}\b|\b(?:rgb|oklch)\(|\dpx\b)/i.test(styles)) {
		throw new Error("Use token variables in src/styles.css");
	}
} else {
	await writeFile(outputPath, css);
	console.log("Generated src/tokens.css");
}
