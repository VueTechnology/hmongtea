import { getDb } from "./db.ts";
import { auditLog } from "./schema.ts";

export async function recordAudit(
	staffId: string,
	action: string,
	entity: string,
	entityId: string,
	detail: Record<string, string | number | boolean | null> = {},
) {
	await getDb().insert(auditLog).values({
		id: crypto.randomUUID(),
		staffId,
		action,
		entity,
		entityId,
		detail,
		createdAt: new Date(),
	});
}
