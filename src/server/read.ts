import { desc, eq } from "drizzle-orm";
import { priceBook, RETAIL_CENTS, TIERS, type Side } from "../domain/prices.ts";
import { paymentLabel, readPaymentGate } from "../domain/gate.ts";
import { accountFromToken, requireStaff, type AccountRow } from "./auth.ts";
import { boot, getDb } from "./db.ts";
import { decryptTaxId } from "./crypto.ts";
import { readCampaign } from "./campaign.ts";
import { countCart, CSRF_COOKIE, parseCookieHeader, SESSION_COOKIE } from "./cookies.ts";
import { randomToken } from "./crypto.ts";
import { listBlasts } from "./blasts.ts";
import { listOwn, staffList, type PreorderFilter, type PreorderRow } from "./orders.ts";
import { listSignups } from "./signups.ts";
import { accounts, addresses, auditLog, mailLog, wholesaleProfiles } from "./schema.ts";

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

export function viewOrder(row: PreorderRow) {
	return {
		id: row.id,
		number: row.number,
		side: row.side as Side,
		status: row.status as "placed" | "shipped" | "cancelled",
		contactName: row.contactName,
		contactEmail: row.contactEmail,
		contactPhone: row.contactPhone,
		line1: row.line1,
		line2: row.line2,
		city: row.city,
		region: row.region,
		postal: row.postal,
		country: row.country,
		qty: row.qty,
		unitCents: row.unitCents,
		totalCents: row.totalCents,
		tierLabel: row.tierLabel,
		shipDate: row.shipDate,
		trackingNumber: row.trackingNumber,
		paymentMode: row.paymentMode,
		paymentStatus: row.paymentStatus,
		createdAt: row.createdAt.toISOString(),
	};
}

export function viewAccount(account: AccountRow) {
	return {
		id: account.id,
		email: account.email,
		name: account.name,
		phone: account.phone,
		role: account.role as "customer" | "staff",
		accountType: account.accountType as Side | null,
		status: account.status as "active" | "pending" | "rejected",
		emailOptOut: account.emailOptOut,
	};
}

export async function readShell(request: Request) {
	await boot();
	const cookies = parseCookieHeader(request.headers.get("cookie"));
	let csrf = cookies[CSRF_COOKIE] ?? "";
	let setCsrf = false;
	if (!csrfPattern.test(csrf)) {
		csrf = randomToken();
		setCsrf = true;
	}
	const account = await accountFromToken(cookies[SESSION_COOKIE]);
	return { setCsrf, csrf, cartCount: countCart(request.headers.get("cookie")), viewer: account ? viewAccount(account) : null };
}

export async function actor(request: Request) {
	await boot();
	const cookies = parseCookieHeader(request.headers.get("cookie"));
	return accountFromToken(cookies[SESSION_COOKIE]);
}

export async function readHome() {
	await boot();
	const row = await readCampaign();
	return { targetCents: row.targetCents, raisedCents: row.raisedCents, label: "placeholder" as const };
}

export async function readTea(request: Request) {
	const account = await actor(request);
	if (!account || account.role !== "customer" || account.accountType !== "wholesale") {
		return { side: "retail" as const, unitCents: RETAIL_CENTS, tiers: null, orderable: true };
	}
	const book = priceBook({ accountType: "wholesale", status: account.status });
	return {
		side: "wholesale" as const,
		unitCents: null,
		tiers: book.tiers ? TIERS.map((tier) => ({ ...tier })) : null,
		orderable: book.orderable,
	};
}

export async function readWholesale(request: Request) {
	const account = await actor(request);
	if (!account || account.role === "staff") {
		return { kind: "guest" as const, tiers: TIERS.map((tier) => ({ ...tier })), netTerms: false };
	}
	if (account.accountType === "retail") return { kind: "retail" as const, tiers: null, netTerms: false };
	if (account.status === "pending") return { kind: "pending" as const, tiers: null, netTerms: false };
	if (account.status === "rejected") return { kind: "rejected" as const, tiers: null, netTerms: false };
	const [profile] = await getDb().select().from(wholesaleProfiles).where(eq(wholesaleProfiles.accountId, account.id)).limit(1);
	return {
		kind: "open" as const,
		tiers: TIERS.map((tier) => ({ ...tier })),
		netTerms: profile?.netTermsPlaceholder ?? false,
	};
}

export async function readCheckout(request: Request) {
	await boot();
	const account = await actor(request);
	const gate = readPaymentGate(process.env);
	const address = account ? await getDb().select().from(addresses).where(eq(addresses.accountId, account.id)).limit(1) : [];
	return {
		viewer: account ? viewAccount(account) : null,
		payment: paymentLabel(gate),
		refused: gate.kind === "refused",
		cartCount: countCart(request.headers.get("cookie")),
		address: address[0]
			? { line1: address[0].line1, line2: address[0].line2, city: address[0].city, region: address[0].region, postal: address[0].postal, country: address[0].country }
			: null,
	};
}

export async function readAccount(request: Request) {
	const account = await actor(request);
	if (!account || account.role !== "customer") return { kind: "login" as const };
	const orders = await listOwn(account);
	const [address] = await getDb().select().from(addresses).where(eq(addresses.accountId, account.id)).limit(1);
	let tax: { masked: string; full: null } | null = null;
	let netTerms = false;
	if (account.accountType === "wholesale") {
		const [profile] = await getDb().select().from(wholesaleProfiles).where(eq(wholesaleProfiles.accountId, account.id)).limit(1);
		if (profile) {
			tax = { masked: `••-•••${profile.taxIdLast4}`, full: null };
			netTerms = profile.netTermsPlaceholder;
		}
	}
	return {
		kind: "ok" as const,
		account: viewAccount(account),
		orders: orders.map(viewOrder),
		address: address ?? null,
		tax,
		netTerms,
	};
}

export async function readOrderPage(request: Request, id: string) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "customer") return { kind: "forbidden" as const };
	const { readPreorder } = await import("./orders.ts");
	try {
		const order = await readPreorder(account, id);
		return { kind: "ok" as const, order: viewOrder(order) };
	} catch {
		return { kind: "missing" as const };
	}
}

export async function readStaffHome(request: Request) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const orders = await staffList(account, { q: "", status: "", side: "" });
	const people = await getDb().select({ id: accounts.id }).from(accounts);
	return { kind: "ok" as const, orders: orders.slice(0, 8).map(viewOrder), accounts: people.length, preorders: orders.length };
}

export async function readStaffOrders(request: Request, filter: PreorderFilter) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const orders = await staffList(account, filter);
	return { kind: "ok" as const, orders: orders.map(viewOrder) };
}

export async function readStaffOrder(request: Request, id: string) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const { readPreorder } = await import("./orders.ts");
	try {
		const order = await readPreorder(account, id);
		return { kind: "ok" as const, order: viewOrder(order) };
	} catch {
		return { kind: "missing" as const };
	}
}

export async function readStaffSignups(request: Request, q: string) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const rows = await listSignups(account, q);
	return {
		kind: "ok" as const,
		signups: rows.map((row) => ({
			id: row.id,
			email: row.email,
			name: row.name ?? "",
			status: row.status,
			createdAt: row.createdAt.toISOString(),
		})),
	};
}

export async function readStaffBlasts(request: Request) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const rows = await listBlasts(account);
	return {
		kind: "ok" as const,
		blasts: rows.map((row) => ({ id: row.id, audience: row.audience, subject: row.subject, createdAt: row.createdAt.toISOString() })),
	};
}

export async function readStaffAccounts(request: Request, q: string, side: string, status: string) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	try {
		requireStaff(account);
	} catch {
		return { kind: "forbidden" as const };
	}
	const rows = await getDb()
		.select({
			id: accounts.id,
			email: accounts.email,
			name: accounts.name,
			role: accounts.role,
			accountType: accounts.accountType,
			status: accounts.status,
			legalName: wholesaleProfiles.legalName,
			cipher: wholesaleProfiles.taxIdCipher,
			last4: wholesaleProfiles.taxIdLast4,
			netTerms: wholesaleProfiles.netTermsPlaceholder,
		})
		.from(accounts)
		.leftJoin(wholesaleProfiles, eq(wholesaleProfiles.accountId, accounts.id))
		.orderBy(desc(accounts.createdAt))
		.limit(200);
	const needle = q.trim().toLowerCase();
	const people = rows
		.filter((row) => (side ? row.accountType === side : true))
		.filter((row) => (status ? row.status === status : true))
		.filter((row) => (needle ? `${row.email} ${row.name} ${row.legalName ?? ""}`.toLowerCase().includes(needle) : true))
		.map((row) => ({
			id: row.id,
			email: row.email,
			name: row.name,
			role: row.role,
			accountType: row.accountType,
			status: row.status,
			legalName: row.legalName ?? "",
			taxMasked: row.last4 ? `••-•••${row.last4}` : "",
			taxFull: row.cipher ? decryptTaxId(row.cipher) : "",
			netTerms: row.netTerms ?? false,
		}));
	return { kind: "ok" as const, people };
}

export async function readAudit(request: Request) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const rows = await getDb().select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(100);
	return {
		kind: "ok" as const,
		rows: rows.map((row) => ({
			id: row.id,
			action: row.action,
			entity: row.entity,
			entityId: row.entityId,
			detail: JSON.stringify(row.detail),
			createdAt: row.createdAt.toISOString(),
		})),
	};
}

export async function readCampaignPage(request: Request) {
	const account = await actor(request);
	if (!account) return { kind: "login" as const };
	if (account.role !== "staff") return { kind: "forbidden" as const };
	const row = await readCampaign();
	return { kind: "ok" as const, targetCents: row.targetCents, raisedCents: row.raisedCents, label: row.label };
}

export async function readDevMail() {
	await boot();
	if (process.env.RESEND_API_KEY?.trim()) return { mode: "resend" as const, messages: [] as { id: string; to: string; subject: string; body: string; createdAt: string }[] };
	const rows = await getDb().select().from(mailLog).orderBy(desc(mailLog.createdAt)).limit(40);
	return {
		mode: "demo" as const,
		messages: rows.map((row) => ({ id: row.id, to: row.toEmail, subject: row.subject, body: row.body, createdAt: row.createdAt.toISOString() })),
	};
}

