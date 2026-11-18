import { eq } from "drizzle-orm";
import { recordAudit } from "./audit.ts";
import type { AccountRow } from "./auth.ts";
import { requireStaff } from "./auth.ts";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { campaign } from "./schema.ts";

export async function readCampaign() {
	const [row] = await getDb().select().from(campaign).where(eq(campaign.id, 1)).limit(1);
	if (!row) throw new Error("Campaign row is missing.");
	return row;
}

export async function updateCampaign(staff: AccountRow, targetCents: number, raisedCents: number) {
	requireStaff(staff);
	if (targetCents <= 0 || raisedCents < 0) throw new AppError("validation", "Enter a target above zero.", "invalid");
	await getDb().update(campaign).set({ targetCents, raisedCents, updatedAt: new Date() }).where(eq(campaign.id, 1));
	await recordAudit(staff.id, "campaign.update", "campaign", "1", { targetCents, raisedCents });
}
