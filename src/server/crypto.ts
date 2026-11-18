import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppError } from "./errors.ts";

export function randomToken(): string {
	return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export function taxKey(): Buffer {
	const hex = process.env.TAX_ID_KEY?.trim() ?? "";
	if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
		throw new AppError("validation", "TAX_ID_KEY must be 64 hex characters.", "invalid");
	}
	return Buffer.from(hex, "hex");
}

export function encryptTaxId(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", taxKey(), iv);
	const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptTaxId(packed: string): string {
	const [ivPart, tagPart, bodyPart] = packed.split(".");
	if (!ivPart || !tagPart || !bodyPart) throw new AppError("validation", "Stored tax ID is unreadable.", "invalid");
	const decipher = createDecipheriv("aes-256-gcm", taxKey(), Buffer.from(ivPart, "base64url"));
	decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
	return Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]).toString("utf8");
}
