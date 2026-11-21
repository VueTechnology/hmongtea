import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "#/db/client";
import {
	accounts,
	auditLog,
	blastRecipients,
	blasts,
	campaign,
	carts,
	mailLog,
	orders,
	products,
	sessions,
	signups,
	storeSettings,
	suppressions,
	unsubscribeTokens,
} from "#/db/schema";
import { type Quote, quoteCart } from "#/domain/cart";
import { maskEin, parseEin } from "#/domain/ein";
import { PRODUCT_NAME, PRODUCT_SKU } from "#/domain/prices";
import {
	dateAfterWeeks,
	dateStringAfterWeeks,
	makePurchasePlan,
	type PlanKind,
	type RetailCart,
	type SubscriptionAction,
} from "#/domain/purchase-plan";
import { newId, newToken, sha256 } from "#/domain/secret";
import type { AddressInput } from "#/domain/validate";
import type { AppEnv } from "#/server/env";
import { deliverEmail } from "#/server/mail";
import { hashPassword } from "#/server/passwords";
import { decryptTaxId, encryptTaxId } from "#/server/tax";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

export type AccountRow = typeof accounts.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;

export type Viewer = {
	id: string;
	email: string;
	role: "customer" | "staff";
	side: "retail" | "wholesale";
	status: "active" | "pending" | "rejected";
	name: string;
	phone: string;
	netTerms: boolean;
	emailOptOut: boolean;
	csrf: string;
};

export type PublicViewer = Omit<Viewer, "csrf" | "phone" | "emailOptOut">;

export function publicViewer(viewer: Viewer): PublicViewer {
	return {
		id: viewer.id,
		email: viewer.email,
		role: viewer.role,
		side: viewer.side,
		status: viewer.status,
		name: viewer.name,
		netTerms: viewer.netTerms,
	};
}

function uniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	if ("code" in error && error.code === "23505") return true;
	if ("cause" in error) return uniqueViolation(error.cause);
	return false;
}

export async function findAccountByEmail(
	db: Database,
	email: string,
): Promise<AccountRow | null> {
	const rows = await db
		.select()
		.from(accounts)
		.where(eq(accounts.email, email))
		.limit(1);
	return rows[0] ?? null;
}

export async function findAccountById(
	db: Database,
	id: string,
): Promise<AccountRow | null> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const rows = await db
		.select()
		.from(accounts)
		.where(eq(accounts.id, id))
		.limit(1);
	return rows[0] ?? null;
}

export async function createAccount(
	db: Database,
	env: AppEnv,
	input: {
		email: string;
		password: string;
		role: "customer" | "staff";
		side: "retail" | "wholesale";
		status: "active" | "pending" | "rejected";
		name?: string;
		phone?: string;
		legalName?: string;
		dba?: string;
		businessAddress?: string;
		businessPhone?: string;
		contactPerson?: string;
		website?: string;
		resaleCertificate?: string;
		taxId?: string | null;
		netTerms?: boolean;
		pricingTier?: "case" | "half" | "pallet" | null;
	},
): Promise<
	{ ok: true; id: string } | { ok: false; error: "taken" | "ein" | "key" }
> {
	let cipher = "";
	let last4 = "";
	if (input.taxId) {
		const ein = parseEin(input.taxId);
		if (!ein) return { ok: false, error: "ein" };
		try {
			const sealed = encryptTaxId(ein, env.taxIdKey);
			cipher = sealed.cipher;
			last4 = sealed.last4;
		} catch {
			return { ok: false, error: "key" };
		}
	}
	const id = newId();
	try {
		await db.insert(accounts).values({
			id,
			email: input.email,
			passwordHash: await hashPassword(input.password),
			role: input.role,
			side: input.side,
			status: input.status,
			name: input.name ?? "",
			phone: input.phone ?? "",
			legalName: input.legalName ?? "",
			dba: input.dba ?? "",
			businessAddress: input.businessAddress ?? "",
			businessPhone: input.businessPhone ?? "",
			contactPerson: input.contactPerson ?? "",
			website: input.website ?? "",
			resaleCertificate: input.resaleCertificate ?? "",
			taxIdCipher: cipher,
			taxIdLast4: last4,
			netTerms: input.netTerms ?? false,
			pricingTier: input.pricingTier ?? null,
		});
	} catch (error) {
		if (uniqueViolation(error)) return { ok: false, error: "taken" };
		throw error;
	}
	return { ok: true, id };
}

export async function ensureStaff(
	db: Database,
	env: AppEnv,
): Promise<{ created: boolean }> {
	const email = env.staffEmail;
	const password = env.staffPassword;
	if (!email || password.length < 12) return { created: false };
	const existing = await findAccountByEmail(db, email);
	if (existing) return { created: false };
	const created = await createAccount(db, env, {
		email,
		password,
		role: "staff",
		side: "retail",
		status: "active",
		name: "",
	});
	return { created: created.ok };
}

export async function ensurePortalAccounts(
	db: Database,
	env: AppEnv,
): Promise<void> {
	if (env.customerEmail && env.customerPassword.length >= 12) {
		const existing = await findAccountByEmail(db, env.customerEmail);
		if (!existing) {
			await createAccount(db, env, {
				email: env.customerEmail,
				password: env.customerPassword,
				role: "customer",
				side: "retail",
				status: "active",
				name: "Retail customer",
			});
		}
	}
	if (env.partnerEmail && env.partnerPassword.length >= 12) {
		const existing = await findAccountByEmail(db, env.partnerEmail);
		if (!existing) {
			await createAccount(db, env, {
				email: env.partnerEmail,
				password: env.partnerPassword,
				role: "customer",
				side: "wholesale",
				status: "active",
				name: "Partner",
				phone: "5550109000",
				legalName: "Hmong Tea Partner",
				businessAddress: "1 Market Street",
				businessPhone: "5550109000",
				contactPerson: "Partner",
				netTerms: true,
			});
		}
	}
}

export async function openSession(
	db: Database,
	accountId: string,
): Promise<{ token: string; csrf: string }> {
	const token = newToken();
	const csrf = newToken();
	await db.insert(sessions).values({
		id: newId(),
		accountId,
		tokenHash: sha256(token),
		csrfToken: csrf,
		expiresAt: new Date(Date.now() + SESSION_MS),
	});
	return { token, csrf };
}

export async function findViewer(
	db: Database,
	token: string | null,
): Promise<Viewer | null> {
	if (!token) return null;
	const rows = await db
		.select({
			account: accounts,
			csrf: sessions.csrfToken,
			expiresAt: sessions.expiresAt,
		})
		.from(sessions)
		.innerJoin(accounts, eq(accounts.id, sessions.accountId))
		.where(eq(sessions.tokenHash, sha256(token)))
		.limit(1);
	const row = rows[0];
	if (!row || row.expiresAt.getTime() <= Date.now()) return null;
	return {
		id: row.account.id,
		email: row.account.email,
		role: row.account.role,
		side: row.account.side,
		status: row.account.status,
		name: row.account.name,
		phone: row.account.phone,
		netTerms: row.account.netTerms,
		emailOptOut: row.account.emailOptOut,
		csrf: row.csrf,
	};
}

export async function deleteSession(
	db: Database,
	token: string,
): Promise<void> {
	await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function setCart(
	db: Database,
	accountId: string,
	side: "retail" | "wholesale",
	cart: RetailCart,
): Promise<void> {
	if (cart.qty <= 0 || side === "wholesale") {
		await db.delete(carts).where(eq(carts.accountId, accountId));
		return;
	}
	await db
		.insert(carts)
		.values({
			accountId,
			side,
			qty: cart.qty,
			purchasePlan: cart.planKind,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: carts.accountId,
			set: {
				side,
				qty: cart.qty,
				purchasePlan: cart.planKind,
				updatedAt: new Date(),
			},
		});
}

export async function readCart(
	db: Database,
	accountId: string,
): Promise<RetailCart> {
	const rows = await db
		.select()
		.from(carts)
		.where(eq(carts.accountId, accountId))
		.limit(1);
	const row = rows[0];
	return row
		? { qty: row.qty, planKind: row.purchasePlan }
		: { qty: 0, planKind: "one-time" };
}

export async function clearCart(
	db: Database,
	accountId: string,
): Promise<void> {
	await db.delete(carts).where(eq(carts.accountId, accountId));
}

export type PlaceInput = {
	account: AccountRow | null;
	orderSide: "retail" | "wholesale";
	qty: number;
	contactName: string;
	contactEmail: string;
	phone: string;
	address: AddressInput;
	payment: "demo" | "stripe" | "net-terms-placeholder";
	placedByStaffId?: string | null;
	guestClaimHash?: string | null;
};

export class StockShort extends Error {}

export async function readStock(db: Database): Promise<number> {
	const rows = await db
		.select()
		.from(products)
		.where(eq(products.sku, PRODUCT_SKU))
		.limit(1);
	return rows[0]?.onHand ?? 0;
}

export async function setStock(db: Database, onHand: number): Promise<boolean> {
	if (!Number.isInteger(onHand) || onHand < 0 || onHand > 1000000) return false;
	const rows = await db
		.update(products)
		.set({ onHand })
		.where(eq(products.sku, PRODUCT_SKU))
		.returning({ sku: products.sku });
	return rows.length === 1;
}

async function takeStock(db: Database, qty: number): Promise<boolean> {
	const rows = await db
		.update(products)
		.set({ onHand: sql`${products.onHand} - ${qty}` })
		.where(
			and(eq(products.sku, PRODUCT_SKU), sql`${products.onHand} >= ${qty}`),
		)
		.returning({ sku: products.sku });
	return rows.length === 1;
}

async function giveStock(db: Database, qty: number): Promise<void> {
	await db
		.update(products)
		.set({ onHand: sql`${products.onHand} + ${qty}` })
		.where(eq(products.sku, PRODUCT_SKU));
}

export async function insertOrder(
	db: Database,
	input: PlaceInput,
	quote: Quote,
): Promise<string> {
	const taken = await takeStock(db, quote.qty);
	if (!taken) throw new StockShort();
	const id = newId();
	const status = input.payment === "stripe" ? "unpaid" : "placed";
	const purchasePlan =
		quote.side === "retail" ? quote.purchasePlan : makePurchasePlan("one-time");
	await db.insert(orders).values({
		id,
		accountId: input.account?.id ?? null,
		side: quote.side,
		status,
		contactName: input.contactName,
		contactEmail: input.contactEmail,
		contactPhone: input.phone,
		shipLine1: input.address.line1,
		shipLine2: input.address.line2,
		shipCity: input.address.city,
		shipRegion: input.address.region,
		shipPostalCode: input.address.postalCode,
		shipCountry: input.address.country,
		qty: quote.qty,
		unitCents: quote.unitCents,
		totalCents: quote.totalCents,
		purchasePlan: purchasePlan.kind,
		subscriptionStatus: purchasePlan.kind === "subscription" ? "active" : null,
		subscriptionIntervalWeeks:
			purchasePlan.kind === "subscription" ? purchasePlan.intervalWeeks : null,
		nextOrderOn:
			purchasePlan.kind === "subscription"
				? dateAfterWeeks(new Date(), purchasePlan.intervalWeeks)
				: null,
		guestClaimHash: input.guestClaimHash ?? null,
		paymentMode: input.payment,
		netTerms: input.payment === "net-terms-placeholder",
		placedByStaffId: input.placedByStaffId ?? null,
	});
	return id;
}

export function quoteForAccount(
	account: AccountRow,
	orderSide: "retail" | "wholesale",
	qty: number,
	planKind: PlanKind = "one-time",
	intervalWeeks = 4,
) {
	if (orderSide === "wholesale") {
		return quoteCart({
			accountSide: account.side,
			accountStatus: account.status,
			orderSide,
			qty,
		});
	}
	return quoteCart({
		accountSide: account.side,
		accountStatus: account.status,
		orderSide,
		purchasePlan: makePurchasePlan(planKind, intervalWeeks),
		qty,
	});
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrder(
	db: Database,
	id: string,
): Promise<OrderRow | null> {
	if (!UUID.test(id)) return null;
	const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function readOrderFor(
	db: Database,
	viewer: Viewer,
	id: string,
): Promise<OrderRow | "forbidden" | null> {
	const row = await getOrder(db, id);
	if (!row) return null;
	if (viewer.role !== "staff" && row.accountId !== viewer.id)
		return "forbidden";
	return row;
}

export async function ordersForAccount(
	db: Database,
	accountId: string,
): Promise<OrderRow[]> {
	return db
		.select()
		.from(orders)
		.where(eq(orders.accountId, accountId))
		.orderBy(desc(orders.createdAt));
}

export async function searchOrders(
	db: Database,
	filter: { q?: string; side?: string; status?: string },
): Promise<OrderRow[]> {
	const clauses = [];
	if (filter.side === "retail" || filter.side === "wholesale")
		clauses.push(eq(orders.side, filter.side));
	if (
		filter.status === "unpaid" ||
		filter.status === "placed" ||
		filter.status === "shipped" ||
		filter.status === "cancelled"
	) {
		clauses.push(eq(orders.status, filter.status));
	}
	const q = filter.q?.trim() ?? "";
	if (q) {
		const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
		clauses.push(sql`(
			${orders.contactEmail} ilike ${pattern} escape '\\'
			or ${orders.contactName} ilike ${pattern} escape '\\'
			or coalesce(${orders.trackingNumber}, '') ilike ${pattern} escape '\\'
			or ${orders.id}::text ilike ${pattern} escape '\\'
		)`);
	}
	return db
		.select()
		.from(orders)
		.where(clauses.length > 0 ? and(...clauses) : undefined)
		.orderBy(desc(orders.createdAt));
}

function behalfQty(
	current: OrderRow,
	qty: number,
): { ok: true; quote: Quote } | { ok: false; error: "qty" } {
	const floor = current.side === "wholesale" ? 12 : 1;
	if (!Number.isInteger(qty) || qty < floor || qty > 999)
		return { ok: false, error: "qty" };
	if (current.side === "retail") {
		return {
			ok: true,
			quote: {
				side: "retail",
				purchasePlan: makePurchasePlan(
					current.purchasePlan,
					current.subscriptionIntervalWeeks ?? 4,
				),
				qty,
				unitCents: current.unitCents,
				totalCents: current.unitCents * qty,
			},
		};
	}
	return {
		ok: true,
		quote: {
			side: "wholesale",
			qty,
			unitCents: current.unitCents,
			totalCents: current.unitCents * qty,
		},
	};
}

export async function updateOrderDetails(
	db: Database,
	id: string,
	input: {
		contactName: string;
		contactPhone: string;
		address: AddressInput;
		qty?: number;
		account: AccountRow | null;
	},
): Promise<"ok" | "missing" | "closed" | "qty"> {
	const current = await getOrder(db, id);
	if (!current) return "missing";
	if (current.status !== "placed" && current.status !== "unpaid")
		return "closed";
	let unitCents = current.unitCents;
	let totalCents = current.totalCents;
	let qty = current.qty;
	if (input.qty != null && input.qty !== current.qty) {
		const quote =
			current.placedByStaffId || !input.account
				? behalfQty(current, input.qty)
				: quoteForAccount(
						input.account,
						current.side,
						input.qty,
						current.purchasePlan,
						current.subscriptionIntervalWeeks ?? 4,
					);
		if (!quote.ok) return "qty";
		const delta = quote.quote.qty - current.qty;
		if (delta > 0) {
			const taken = await takeStock(db, delta);
			if (!taken) return "qty";
		} else if (delta < 0) {
			await giveStock(db, -delta);
		}
		qty = quote.quote.qty;
		unitCents = quote.quote.unitCents;
		totalCents = quote.quote.totalCents;
	}
	await db
		.update(orders)
		.set({
			contactName: input.contactName,
			contactPhone: input.contactPhone,
			shipLine1: input.address.line1,
			shipLine2: input.address.line2,
			shipCity: input.address.city,
			shipRegion: input.address.region,
			shipPostalCode: input.address.postalCode,
			shipCountry: input.address.country,
			qty,
			unitCents,
			totalCents,
			updatedAt: new Date(),
		})
		.where(eq(orders.id, id));
	return "ok";
}

export async function cancelOrder(
	db: Database,
	id: string,
	accountId: string | null,
): Promise<"ok" | "missing" | "forbidden" | "closed"> {
	const current = await getOrder(db, id);
	if (!current) return "missing";
	if (accountId && current.accountId !== accountId) return "forbidden";
	if (current.status !== "placed" && current.status !== "unpaid")
		return "closed";
	await db
		.update(orders)
		.set({
			status: "cancelled",
			subscriptionStatus:
				current.purchasePlan === "subscription" ? "cancelled" : null,
			nextOrderOn: null,
			updatedAt: new Date(),
		})
		.where(eq(orders.id, id));
	await giveStock(db, current.qty);
	return "ok";
}

export async function shipOrder(
	db: Database,
	id: string,
	shipDate: string,
	trackingNumber: string,
): Promise<"ok" | "missing" | "closed"> {
	const current = await getOrder(db, id);
	if (!current) return "missing";
	if (current.status !== "placed") return "closed";
	await db
		.update(orders)
		.set({ status: "shipped", shipDate, trackingNumber, updatedAt: new Date() })
		.where(and(eq(orders.id, id), eq(orders.status, "placed")));
	return "ok";
}

export async function deleteCancelledOrder(
	db: Database,
	id: string,
): Promise<"ok" | "missing" | "closed"> {
	const current = await getOrder(db, id);
	if (!current) return "missing";
	if (current.status !== "cancelled") return "closed";
	await db
		.delete(orders)
		.where(and(eq(orders.id, id), eq(orders.status, "cancelled")));
	return "ok";
}

export async function markOrderPaid(
	db: Database,
	id: string,
): Promise<boolean> {
	if (!UUID.test(id)) return false;
	const rows = await db
		.update(orders)
		.set({ status: "placed", updatedAt: new Date() })
		.where(and(eq(orders.id, id), eq(orders.status, "unpaid")))
		.returning({ id: orders.id });
	return rows.length === 1;
}

export async function updateAccountContact(
	db: Database,
	id: string,
	input: { name: string; phone: string; email: string },
): Promise<"ok" | "taken"> {
	try {
		await db
			.update(accounts)
			.set({
				name: input.name,
				phone: input.phone,
				email: input.email,
				updatedAt: new Date(),
			})
			.where(eq(accounts.id, id));
	} catch (error) {
		if (uniqueViolation(error)) return "taken";
		throw error;
	}
	await db
		.update(orders)
		.set({
			contactEmail: input.email,
			contactName: input.name,
			contactPhone: input.phone,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(orders.accountId, id),
				inArray(orders.status, ["placed", "unpaid"]),
			),
		);
	return "ok";
}

export async function setAccountStatus(
	db: Database,
	id: string,
	status: "active" | "rejected",
): Promise<boolean> {
	const rows = await db
		.update(accounts)
		.set({ status, updatedAt: new Date() })
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.side, "wholesale"),
				eq(accounts.role, "customer"),
			),
		)
		.returning({ id: accounts.id });
	return rows.length === 1;
}

export async function setNetTerms(
	db: Database,
	id: string,
	netTerms: boolean,
): Promise<boolean> {
	const rows = await db
		.update(accounts)
		.set({ netTerms, updatedAt: new Date() })
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.side, "wholesale"),
				eq(accounts.status, "active"),
			),
		)
		.returning({ id: accounts.id });
	return rows.length === 1;
}

export async function listStores(db: Database): Promise<
	{
		id: string;
		name: string;
		city: string;
		state: string;
		zip: string;
		directions: string;
		sample: boolean;
	}[]
> {
	const rows = await db
		.select()
		.from(accounts)
		.where(
			and(
				eq(accounts.role, "customer"),
				eq(accounts.side, "wholesale"),
				eq(accounts.status, "active"),
				eq(accounts.listedStore, true),
			),
		)
		.orderBy(asc(accounts.storeCity), asc(accounts.storeState));
	return rows.map((row) => ({
		id: row.id,
		name: row.dba || row.legalName || row.businessAddress,
		city: row.storeCity,
		state: row.storeState,
		zip: row.storeZip,
		directions: row.storeDirections,
		sample: row.id.startsWith("c0870000-") || row.email.startsWith("sample-"),
	}));
}

export async function setStoreListing(
	db: Database,
	id: string,
	input: {
		listed: boolean;
		city: string;
		state: string;
		zip: string;
		directions: string;
	},
): Promise<boolean> {
	const rows = await db
		.update(accounts)
		.set({
			listedStore: input.listed,
			storeCity: input.city,
			storeState: input.state,
			storeZip: input.zip,
			storeDirections: input.directions,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.side, "wholesale"),
				eq(accounts.status, "active"),
			),
		)
		.returning({ id: accounts.id });
	return rows.length === 1;
}

export async function listRetail(db: Database): Promise<AccountRow[]> {
	return db
		.select()
		.from(accounts)
		.where(and(eq(accounts.role, "customer"), eq(accounts.side, "retail")))
		.orderBy(desc(accounts.createdAt));
}

export async function readProduct(db: Database): Promise<{
	sku: string;
	name: string;
	onHand: number;
} | null> {
	const rows = await db
		.select()
		.from(products)
		.where(eq(products.sku, PRODUCT_SKU))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	return { sku: row.sku, name: row.name || PRODUCT_NAME, onHand: row.onHand };
}

export async function readSubscriptionInterval(db: Database): Promise<number> {
	const rows = await db
		.select()
		.from(storeSettings)
		.where(eq(storeSettings.id, 1))
		.limit(1);
	return rows[0]?.subscriptionIntervalWeeks ?? 4;
}

export async function setSubscriptionInterval(
	db: Database,
	intervalWeeks: number,
): Promise<boolean> {
	if (
		!Number.isInteger(intervalWeeks) ||
		intervalWeeks < 1 ||
		intervalWeeks > 52
	)
		return false;
	const rows = await db
		.update(storeSettings)
		.set({ subscriptionIntervalWeeks: intervalWeeks, updatedAt: new Date() })
		.where(eq(storeSettings.id, 1))
		.returning({ id: storeSettings.id });
	return rows.length === 1;
}

export async function updateSubscription(
	db: Database,
	input: { orderId: string; accountId: string; action: SubscriptionAction },
): Promise<"ok" | "missing" | "forbidden" | "closed" | "interval"> {
	const current = await getOrder(db, input.orderId);
	if (current?.purchasePlan !== "subscription") return "missing";
	if (current.accountId !== input.accountId) return "forbidden";
	if (input.action.kind === "cancel") {
		if (current.subscriptionStatus === "cancelled") return "ok";
		await db
			.update(orders)
			.set({
				subscriptionStatus: "cancelled",
				nextOrderOn: null,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, current.id));
		return "ok";
	}
	if (
		current.subscriptionStatus !== "active" ||
		!current.nextOrderOn ||
		!current.subscriptionIntervalWeeks
	)
		return "closed";
	if (input.action.kind === "skip") {
		await db
			.update(orders)
			.set({
				nextOrderOn: dateStringAfterWeeks(
					current.nextOrderOn,
					current.subscriptionIntervalWeeks,
				),
				updatedAt: new Date(),
			})
			.where(eq(orders.id, current.id));
		return "ok";
	}
	const intervalWeeks = input.action.intervalWeeks;
	if (
		!Number.isInteger(intervalWeeks) ||
		intervalWeeks < 1 ||
		intervalWeeks > 52
	)
		return "interval";
	await db
		.update(orders)
		.set({
			subscriptionIntervalWeeks: intervalWeeks,
			nextOrderOn: dateAfterWeeks(new Date(), intervalWeeks),
			updatedAt: new Date(),
		})
		.where(eq(orders.id, current.id));
	return "ok";
}

export async function claimGuestOrder(
	db: Database,
	input: { orderId: string; token: string; accountId: string; email: string },
): Promise<boolean> {
	const rows = await db
		.update(orders)
		.set({
			accountId: input.accountId,
			guestClaimHash: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(orders.id, input.orderId),
				eq(orders.guestClaimHash, sha256(input.token)),
				eq(orders.contactEmail, input.email),
				isNull(orders.accountId),
			),
		)
		.returning({ id: orders.id });
	return rows.length === 1;
}

export async function listWholesale(
	db: Database,
	status: string,
): Promise<AccountRow[]> {
	const clauses = [
		eq(accounts.side, "wholesale"),
		eq(accounts.role, "customer"),
	];
	if (status === "pending" || status === "active" || status === "rejected")
		clauses.push(eq(accounts.status, status));
	return db
		.select()
		.from(accounts)
		.where(and(...clauses))
		.orderBy(desc(accounts.createdAt));
}

export function maskForAccount(account: AccountRow): string {
	return account.taxIdLast4 ? maskEin(account.taxIdLast4) : "";
}

export function revealTaxId(account: AccountRow, env: AppEnv): string | null {
	if (!account.taxIdCipher) return null;
	return decryptTaxId(account.taxIdCipher, env.taxIdKey);
}

export async function audit(
	db: Database,
	staffId: string,
	action: string,
	subjectType: string,
	subjectId: string,
	detail = "",
): Promise<void> {
	await db.insert(auditLog).values({
		id: newId(),
		staffId,
		action,
		subjectType,
		subjectId,
		detail,
	});
}

export async function listAudit(db: Database) {
	return db
		.select({
			id: auditLog.id,
			staffId: auditLog.staffId,
			staffEmail: accounts.email,
			action: auditLog.action,
			subjectType: auditLog.subjectType,
			subjectId: auditLog.subjectId,
			detail: auditLog.detail,
			createdAt: auditLog.createdAt,
		})
		.from(auditLog)
		.leftJoin(accounts, eq(accounts.id, auditLog.staffId))
		.orderBy(desc(auditLog.createdAt))
		.limit(200);
}

export async function readCampaign(db: Database) {
	const rows = await db
		.select()
		.from(campaign)
		.where(eq(campaign.id, 1))
		.limit(1);
	return rows[0] ?? null;
}

export async function updateCampaign(
	db: Database,
	targetCents: number,
	raisedCents: number,
): Promise<void> {
	await db
		.update(campaign)
		.set({ targetCents, raisedCents, updatedAt: new Date() })
		.where(eq(campaign.id, 1));
}

export async function listMail(db: Database) {
	return db.select().from(mailLog).orderBy(desc(mailLog.createdAt)).limit(100);
}

async function rememberUnsubscribe(
	db: Database,
	email: string,
	token: string,
): Promise<void> {
	await db
		.insert(unsubscribeTokens)
		.values({ tokenHash: sha256(token), email });
}

export async function requestSignup(
	db: Database,
	env: AppEnv,
	input: { email: string; name: string },
): Promise<"confirm" | "already" | "unsubscribed"> {
	const blocked = await db
		.select()
		.from(suppressions)
		.where(eq(suppressions.email, input.email))
		.limit(1);
	if (blocked.length > 0) return "unsubscribed";
	const existing = await db
		.select()
		.from(signups)
		.where(eq(signups.email, input.email))
		.limit(1);
	const row = existing[0];
	if (row?.status === "unsubscribed") return "unsubscribed";
	if (row?.status === "confirmed") return "already";
	const confirm = newToken();
	const unsub = newToken();
	if (!row) {
		await db.insert(signups).values({
			id: newId(),
			email: input.email,
			name: input.name,
			status: "pending",
			confirmTokenHash: sha256(confirm),
		});
	} else {
		await db
			.update(signups)
			.set({ name: input.name, confirmTokenHash: sha256(confirm) })
			.where(eq(signups.id, row.id));
	}
	await rememberUnsubscribe(db, input.email, unsub);
	const body = [
		"Confirm your request for updates from hmongtea.com.",
		"",
		`${env.appOrigin}/updates/confirm?token=${confirm}`,
		"",
		"Unsubscribe",
		`${env.appOrigin}/unsubscribe?token=${unsub}`,
	].join("\n");
	await deliverEmail(db, env, {
		to: input.email,
		subject: "Confirm updates from hmongtea.com",
		body,
	});
	return "confirm";
}

export async function confirmSignup(
	db: Database,
	token: string,
): Promise<"confirmed" | "invalid" | "unsubscribed"> {
	if (!token) return "invalid";
	const rows = await db
		.select()
		.from(signups)
		.where(eq(signups.confirmTokenHash, sha256(token)))
		.limit(1);
	const row = rows[0];
	if (!row) return "invalid";
	const blocked = await db
		.select()
		.from(suppressions)
		.where(eq(suppressions.email, row.email))
		.limit(1);
	if (row.status === "unsubscribed" || blocked.length > 0)
		return "unsubscribed";
	if (row.status === "confirmed") return "confirmed";
	await db
		.update(signups)
		.set({ status: "confirmed", confirmedAt: new Date() })
		.where(eq(signups.id, row.id));
	return "confirmed";
}

export async function unsubscribeToken(
	db: Database,
	token: string,
): Promise<"done" | "invalid"> {
	if (!token) return "invalid";
	const rows = await db
		.select()
		.from(unsubscribeTokens)
		.where(eq(unsubscribeTokens.tokenHash, sha256(token)))
		.limit(1);
	const row = rows[0];
	if (!row) return "invalid";
	await suppressEmail(db, row.email);
	return "done";
}

export async function suppressEmail(
	db: Database,
	email: string,
): Promise<void> {
	await db.insert(suppressions).values({ email }).onConflictDoNothing();
	await db
		.update(signups)
		.set({ status: "unsubscribed" })
		.where(eq(signups.email, email));
	await db
		.update(accounts)
		.set({ emailOptOut: true, updatedAt: new Date() })
		.where(eq(accounts.email, email));
}

export async function listSignups(
	db: Database,
	filter: { q?: string; status?: string },
) {
	const clauses = [];
	if (
		filter.status === "pending" ||
		filter.status === "confirmed" ||
		filter.status === "unsubscribed"
	) {
		clauses.push(eq(signups.status, filter.status));
	}
	const q = filter.q?.trim() ?? "";
	if (q) {
		const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
		clauses.push(
			sql`(${signups.email} ilike ${pattern} escape '\\' or ${signups.name} ilike ${pattern} escape '\\')`,
		);
	}
	return db
		.select()
		.from(signups)
		.where(clauses.length > 0 ? and(...clauses) : undefined)
		.orderBy(desc(signups.createdAt));
}

export async function updateSignup(
	db: Database,
	id: string,
	input: { name: string; status: "pending" | "confirmed" | "unsubscribed" },
): Promise<boolean> {
	if (!UUID.test(id)) return false;
	const rows = await db
		.select()
		.from(signups)
		.where(eq(signups.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) return false;
	await db
		.update(signups)
		.set({
			name: input.name,
			status: input.status,
			confirmedAt:
				input.status === "confirmed"
					? (row.confirmedAt ?? new Date())
					: row.confirmedAt,
		})
		.where(eq(signups.id, id));
	if (input.status === "unsubscribed") await suppressEmail(db, row.email);
	return true;
}

export async function deleteSignup(db: Database, id: string): Promise<boolean> {
	if (!UUID.test(id)) return false;
	const rows = await db
		.delete(signups)
		.where(eq(signups.id, id))
		.returning({ id: signups.id });
	return rows.length === 1;
}

export async function sendBlast(
	db: Database,
	env: AppEnv,
	staffId: string,
	input: { audience: "preorder" | "updates"; subject: string; body: string },
): Promise<{ blastId: string; count: number }> {
	const blastId = newId();
	const blockedRows = await db
		.select({ email: suppressions.email })
		.from(suppressions);
	const blocked = new Set(blockedRows.map((row) => row.email));
	let emails: string[] = [];
	if (input.audience === "preorder") {
		const rows = await db
			.selectDistinct({ email: accounts.email })
			.from(accounts)
			.innerJoin(orders, eq(orders.accountId, accounts.id))
			.where(
				and(
					eq(accounts.role, "customer"),
					eq(accounts.emailOptOut, false),
					eq(orders.side, "retail"),
					inArray(orders.status, ["placed", "shipped"]),
				),
			);
		emails = rows.map((row) => row.email);
	} else {
		const rows = await db
			.select({ email: signups.email })
			.from(signups)
			.where(eq(signups.status, "confirmed"));
		emails = rows.map((row) => row.email);
	}
	const unique = [...new Set(emails.filter((email) => !blocked.has(email)))];
	await db.insert(blasts).values({
		id: blastId,
		staffId,
		audience: input.audience,
		subject: input.subject,
		body: input.body,
	});
	for (const email of unique) {
		const token = newToken();
		await rememberUnsubscribe(db, email, token);
		const body = `${input.body.trim()}\n\nUnsubscribe\n${env.appOrigin}/unsubscribe?token=${token}\n`;
		let status: "logged" | "sent" | "failed" = "failed";
		try {
			status = await deliverEmail(db, env, {
				to: email,
				subject: input.subject,
				body,
			});
		} catch {
			status = "failed";
		}
		await db
			.insert(blastRecipients)
			.values({ id: newId(), blastId, email, status });
	}
	await audit(
		db,
		staffId,
		"blast.send",
		"blast",
		blastId,
		`${input.audience}:${unique.length}`,
	);
	return { blastId, count: unique.length };
}

export async function blastRecipientsFor(db: Database, blastId: string) {
	return db
		.select()
		.from(blastRecipients)
		.where(eq(blastRecipients.blastId, blastId));
}

export function ordersToCsv(rows: OrderRow[]): string {
	const header = [
		"side",
		"order_id",
		"email",
		"name",
		"status",
		"qty",
		"unit_cents",
		"total_cents",
		"ship_date",
		"tracking",
		"created_at",
	];
	const lines = [header.join(",")];
	for (const row of rows) {
		lines.push(
			[
				row.side,
				row.id,
				csvCell(row.contactEmail),
				csvCell(row.contactName),
				row.status,
				String(row.qty),
				String(row.unitCents),
				String(row.totalCents),
				row.shipDate ?? "",
				csvCell(row.trackingNumber ?? ""),
				row.createdAt.toISOString(),
			].join(","),
		);
	}
	return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
	if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
	return value;
}
