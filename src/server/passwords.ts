const OPTIONS = { algorithm: "argon2id" as const, memoryCost: 19456, timeCost: 2 };

export async function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password, OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash);
}
