import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBytes(keyB64: string): Buffer {
	const buf = Buffer.from(keyB64, "base64");
	if (buf.length !== 32) throw new Error("TAX_ID_KEY must decode to 32 bytes");
	return buf;
}

export function encryptTaxId(
	ein: string,
	keyB64: string,
): { cipher: string; last4: string } {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", keyBytes(keyB64), iv);
	const data = Buffer.concat([cipher.update(ein, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		cipher: `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`,
		last4: ein.replace(/\D/g, "").slice(-4),
	};
}

export function decryptTaxId(payload: string, keyB64: string): string {
	const [version, iv, tag, data] = payload.split(":");
	if (version !== "v1" || !iv || !tag || !data)
		throw new Error("tax id cipher");
	const decipher = createDecipheriv(
		"aes-256-gcm",
		keyBytes(keyB64),
		Buffer.from(iv, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tag, "base64url"));
	const plain = Buffer.concat([
		decipher.update(Buffer.from(data, "base64url")),
		decipher.final(),
	]);
	return plain.toString("utf8");
}
