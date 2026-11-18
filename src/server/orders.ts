import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { readPaymentGate } from "../domain/gate.ts";
import { priceBook, quote, type Side } from "../domain/prices.ts";
import type { AddressInput } from "../domain/validate.ts";
import { likePattern, parseEmail, parseOptional, parseRequired } from "../domain/validate.ts";
import { recordAudit } from "./audit.ts";
import { requireCustomer, requireStaff, saveAddress, type AccountRow } from "./auth.ts";
import { getDb } from "./db.ts";
import { AppError } from "./errors.ts";
import { accounts, counters, preorders } from "./schema.ts";

export type PreorderRow = typeof preorders.$inferSelect;

function paymentFields() {
	const gate = readPaymentGate(process.env);
	if (gate.kind === "refused") throw new AppError("forbidden", gate.reason, "payment");
	if (gate.kind === "demo") return { paymentMode: "demo", paymentStatus: "demo" };
	return { paymentMode: "stripe_test", paymentStatus: "unpaid" };
}

async function insertPreorder(account: AccountRow, side: Side, qty: number, contact: { name: string; email: string; phone: string }, address: AddressInput) {
	const priced = quote(side, qty);
	if (!priced) throw new AppError("validation", "Enter a whole number of packs within the minimum.", "qty");
	const pay = paymentFields();
	const now = new Date();
	const id = crypto.randomUUID();
	await getDb().transaction(async (tx) => {
		const [counter] = await tx
			.update(counters)
			.set({ value: sql`${counters.value} + 1` })
			.where(eq(counters.name, "preorder"))
			.returning();
		if (!counter) throw new Error("Missing preorder counter.");
		await tx.insert(preorders).values({
			id,
			number: `HMT-${counter.value}`,
			accountId: account.id,
			side,
			status: "placed",
			contactName: contact.name,
			contactEmail: contact.email,
			contactPhone: contact.phone,
			line1: address.line1,
			line2: address.line2,
			city: address.city,
			region: address.region,
			postal: address.postal,
			country: address.country,
			qty: priced.qty,
			unitCents: priced.unitCents,
			totalCents: priced.totalCents,
			tierLabel: priced.tierLabel,
			shipDate: null,
			trackingNumber: null,
			paymentMode: pay.paymentMode,
			paymentStatus: pay.paymentStatus,
			stripeSessionId: null,
			createdAt: now,
			updatedAt: now,
			cancelledAt: null,
		});
	});
	await saveAddress(account.id, address);
	const [order] = await getDb().select().from(preorders).where(eq(preorders.id, id)).limit(1);
	if (!order) throw new Error("Pre-order insert did not return a row.");
	return order;
}

function contactFrom(account: AccountRow, name: unknown, phone: unknown, email: unknown) {
	const contactName = parseRequired(name, 120) ?? account.name;
	const contactPhone = parseOptional(phone, 40);
	const contactEmail = parseEmail(email) ?? account.email;
	if (!contactName || contactPhone === null || !contactEmail) {
		throw new AppError("validation", "Check the form and try again.", "invalid");
	}
	return { name: contactName, email: contactEmail, phone: contactPhone };
}

export async function placeRetail(account: AccountRow, qty: number, name: unknown, phone: unknown, address: AddressInput) {
	const customer = requireCustomer(account);
	if (customer.accountType !== "retail") throw new AppError("forbidden", "Retail checkout is for retail accounts.", "forbidden");
	if (customer.status !== "active") throw new AppError("forbidden", "This account cannot order.", "forbidden");
	if (qty < 1) throw new AppError("validation", "Add a pack before checkout.", "empty");
	return insertPreorder(customer, "retail", qty, contactFrom(customer, name, phone, customer.email), address);
}

export async function placeWholesale(account: AccountRow, qty: number, name: unknown, phone: unknown, address: AddressInput) {
	const customer = requireCustomer(account);
	if (customer.accountType !== "wholesale") throw new AppError("forbidden", "Wholesale ordering is for wholesale accounts.", "forbidden");
	if (customer.status === "pending") throw new AppError("forbidden", "This wholesale account is waiting for approval.", "pending");
	if (customer.status !== "active") throw new AppError("forbidden", "This account cannot order.", "forbidden");
	const book = priceBook({ accountType: "wholesale", status: customer.status });
	if (!book.orderable || !book.tiers) throw new AppError("forbidden", "Wholesale prices are not available.", "forbidden");
	return insertPreorder(customer, "wholesale", qty, contactFrom(customer, name, phone, customer.email), address);
}

export async function readPreorder(actor: AccountRow, id: string): Promise<PreorderRow> {
	const [order] = await getDb().select().from(preorders).where(eq(preorders.id, id)).limit(1);
	if (!order) throw new AppError("not_found", "No pre-order.", "invalid");
	if (actor.role !== "staff" && order.accountId !== actor.id) throw new AppError("not_found", "No pre-order.", "invalid");
	return order;
}

export async function listOwn(account: AccountRow) {
	const customer = requireCustomer(account);
	return getDb().select().from(preorders).where(eq(preorders.accountId, customer.id)).orderBy(desc(preorders.createdAt));
}

export async function updateOwnPreorder(account: AccountRow, id: string, name: unknown, phone: unknown, email: unknown, address: AddressInput) {
	const order = await readPreorder(requireCustomer(account), id);
	if (order.status !== "placed") throw new AppError("forbidden", "This pre-order has already shipped.", "shipped");
	const contact = contactFrom(account, name, phone, email);
	await getDb()
		.update(preorders)
		.set({
			contactName: contact.name,
			contactEmail: contact.email,
			contactPhone: contact.phone,
			...address,
			updatedAt: new Date(),
		})
		.where(eq(preorders.id, order.id));
	await saveAddress(account.id, address);
}

export async function cancelOwn(account: AccountRow, id: string) {
	const order = await readPreorder(requireCustomer(account), id);
	if (order.status !== "placed") throw new AppError("forbidden", "This pre-order has already shipped.", "shipped");
	const now = new Date();
	await getDb().update(preorders).set({ status: "cancelled", cancelledAt: now, updatedAt: now }).where(eq(preorders.id, order.id));
}

export type PreorderFilter = { q: string; status: "" | "placed" | "shipped" | "cancelled"; side: "" | Side };

function filterWhere(filter: PreorderFilter) {
	const parts = [];
	if (filter.status) parts.push(eq(preorders.status, filter.status));
	if (filter.side) parts.push(eq(preorders.side, filter.side));
	if (filter.q) {
		const pattern = likePattern(filter.q);
		parts.push(or(ilike(preorders.contactEmail, pattern), ilike(preorders.contactName, pattern), ilike(preorders.number, pattern)));
	}
	return parts.length ? and(...parts) : undefined;
}

export async function staffList(staff: AccountRow, filter: PreorderFilter) {
	requireStaff(staff);
	const where = filterWhere(filter);
	const rows = getDb().select().from(preorders);
	const filtered = where ? rows.where(where) : rows;
	return filtered.orderBy(desc(preorders.createdAt)).limit(200);
}

export async function staffEdit(staff: AccountRow, id: string, name: unknown, phone: unknown, email: unknown, address: AddressInput) {
	requireStaff(staff);
	const order = await readPreorder(staff, id);
	if (order.status !== "placed") throw new AppError("forbidden", "This pre-order can no longer be edited.", "shipped");
	const contactName = parseRequired(name, 120);
	const contactPhone = parseOptional(phone, 40);
	const contactEmail = parseEmail(email);
	if (!contactName || contactPhone === null || !contactEmail) throw new AppError("validation", "Check the form and try again.", "invalid");
	await getDb()
		.update(preorders)
		.set({ contactName, contactPhone, contactEmail, ...address, updatedAt: new Date() })
		.where(eq(preorders.id, order.id));
	await recordAudit(staff.id, "preorder.edit", "preorder", order.id, { number: order.number });
}

export async function markShipped(staff: AccountRow, id: string, shipDate: string, tracking: string) {
	requireStaff(staff);
	const order = await readPreorder(staff, id);
	if (order.status !== "placed") throw new AppError("forbidden", "This pre-order has already shipped.", "shipped");
	await getDb()
		.update(preorders)
		.set({ status: "shipped", shipDate, trackingNumber: tracking, updatedAt: new Date() })
		.where(eq(preorders.id, order.id));
	await recordAudit(staff.id, "preorder.ship", "preorder", order.id, { tracking, shipDate });
}

export async function deleteCancelled(staff: AccountRow, id: string) {
	requireStaff(staff);
	const order = await readPreorder(staff, id);
	if (order.status !== "cancelled") throw new AppError("forbidden", "Cancel the pre-order before deleting it.", "forbidden");
	await getDb().delete(preorders).where(eq(preorders.id, order.id));
	await recordAudit(staff.id, "preorder.delete", "preorder", order.id, { number: order.number });
}

export async function exportCsv(staff: AccountRow, filter: PreorderFilter) {
	requireStaff(staff);
	const rows = await staffList(staff, filter);
	const header = ["number", "side", "status", "email", "name", "qty", "total_cents", "ship_date", "tracking"];
	const lines = [header.join(",")];
	for (const row of rows) {
		lines.push(
			[row.number, row.side, row.status, row.contactEmail, row.contactName, row.qty, row.totalCents, row.shipDate ?? "", row.trackingNumber ?? ""]
				.map(csvCell)
				.join(","),
		);
	}
	await recordAudit(staff.id, "preorder.export", "preorder", "csv", { rows: rows.length });
	return lines.join("\n");
}

function csvCell(value: string | number): string {
	const text = String(value);
	if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
	return text;
}

export async function countPreorders() {
	const [row] = await getDb().select({ value: sql<number>`count(*)::int` }).from(preorders);
	return row?.value ?? 0;
}

export async function countAccounts() {
	const [row] = await getDb().select({ value: sql<number>`count(*)::int` }).from(accounts);
	return row?.value ?? 0;
}
