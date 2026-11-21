import { getDb } from "#/db/client";
import {
	MOQ,
	PARTNER_TIERS,
	PRODUCT_NAME,
	RETAIL_CENTS,
	SUBSCRIPTION_CENTS,
	WHOLESALE_TIERS,
} from "#/domain/prices";
import {
	type PlanKind,
	parseRetailCartCookie,
	type RetailCart,
} from "#/domain/purchase-plan";
import { newToken } from "#/domain/secret";
import { readEnv } from "#/server/env";
import { listDeskTargets } from "#/server/staff-desk";
import {
	confirmSignup,
	findAccountById,
	findViewer,
	listAudit,
	listMail,
	listRetail,
	listSignups,
	listStores,
	listWholesale,
	maskForAccount,
	type OrderRow,
	ordersForAccount,
	type PublicViewer,
	publicViewer,
	readCampaign,
	readCart,
	readOrderFor,
	readProduct,
	readSubscriptionInterval,
	revealTaxId,
	searchOrders,
	unsubscribeToken,
	type Viewer,
} from "#/server/store";

export type OrderView = {
	id: string;
	accountId: string | null;
	side: "retail" | "wholesale";
	status: "unpaid" | "placed" | "shipped" | "cancelled";
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	line1: string;
	line2: string;
	city: string;
	region: string;
	postalCode: string;
	country: string;
	qty: number;
	unitCents: number;
	totalCents: number;
	purchasePlan: "one-time" | "subscription";
	subscriptionStatus: "active" | "cancelled" | null;
	subscriptionIntervalWeeks: number | null;
	nextOrderOn: string | null;
	paymentMode: string;
	netTerms: boolean;
	shipDate: string | null;
	trackingNumber: string | null;
	placedByStaffId: string | null;
	createdAt: string;
};

export type Shell = {
	csrf: string;
	cartQty: number;
	cartPlanKind: PlanKind;
	subscriptionIntervalWeeks: number;
	viewer: PublicViewer | null;
	issueCsrf: boolean;
	demoMail: boolean;
};

export function viewOrder(row: OrderRow): OrderView {
	return {
		id: row.id,
		accountId: row.accountId,
		side: row.side,
		status: row.status,
		contactName: row.contactName,
		contactEmail: row.contactEmail,
		contactPhone: row.contactPhone,
		line1: row.shipLine1,
		line2: row.shipLine2,
		city: row.shipCity,
		region: row.shipRegion,
		postalCode: row.shipPostalCode,
		country: row.shipCountry,
		qty: row.qty,
		unitCents: row.unitCents,
		totalCents: row.totalCents,
		purchasePlan: row.purchasePlan,
		subscriptionStatus: row.subscriptionStatus,
		subscriptionIntervalWeeks: row.subscriptionIntervalWeeks,
		nextOrderOn: row.nextOrderOn,
		paymentMode: row.paymentMode,
		netTerms: row.netTerms,
		shipDate: row.shipDate,
		trackingNumber: row.trackingNumber,
		placedByStaffId: row.placedByStaffId,
		createdAt: row.createdAt.toISOString(),
	};
}

export async function buildShell(input: {
	session: string;
	cart: string;
	csrf: string;
}): Promise<Shell> {
	const viewer = input.session
		? await findViewer(getDb(), input.session)
		: null;
	const demoMail = readEnv().resendApiKey.length === 0;
	const cart: RetailCart =
		viewer?.role === "customer" && viewer.side === "retail"
			? await readCart(getDb(), viewer.id)
			: viewer
				? { qty: 0, planKind: "one-time" }
				: parseRetailCartCookie(input.cart);
	const subscriptionIntervalWeeks = await readSubscriptionInterval(getDb());
	const shared = {
		cartQty: cart.qty,
		cartPlanKind: cart.planKind,
		subscriptionIntervalWeeks,
		demoMail,
	};
	if (viewer)
		return {
			...shared,
			csrf: viewer.csrf,
			viewer: publicViewer(viewer),
			issueCsrf: false,
		};
	if (input.csrf)
		return {
			...shared,
			csrf: input.csrf,
			viewer: null,
			issueCsrf: false,
		};
	return {
		...shared,
		csrf: newToken(),
		viewer: null,
		issueCsrf: true,
	};
}

async function viewer(session: string): Promise<Viewer | null> {
	if (!session) return null;
	return findViewer(getDb(), session);
}

export async function readHome() {
	const row = await readCampaign(getDb());
	return {
		productName: PRODUCT_NAME,
		retailCents: RETAIL_CENTS,
		subscriptionCents: SUBSCRIPTION_CENTS,
		subscriptionIntervalWeeks: await readSubscriptionInterval(getDb()),
		targetCents: row?.targetCents ?? 0,
		raisedCents: row?.raisedCents ?? 0,
		placeholder: row?.placeholder ?? true,
	};
}

export async function readCatalog() {
	return {
		productName: PRODUCT_NAME,
		retailCents: RETAIL_CENTS,
		moq: MOQ,
		tiers: WHOLESALE_TIERS,
	};
}

export async function publicStores(query: string) {
	const q = query.trim().toLowerCase();
	const stores = await listStores(getDb());
	const filtered = q
		? stores.filter(
				(s) =>
					s.city.toLowerCase().includes(q) ||
					s.state.toLowerCase().includes(q) ||
					s.zip.includes(q),
			)
		: stores;
	return { stores: filtered };
}

export type Gate<T> =
	| { kind: "anonymous" }
	| { kind: "forbidden" }
	| ({ kind: "ok" } & T);

export async function accountPage(session: string): Promise<
	Gate<{
		orders: OrderView[];
		contact: { name: string; email: string; phone: string };
	}>
> {
	const current = await viewer(session);
	if (!current) return { kind: "anonymous" };
	if (current.role !== "customer" || current.side !== "retail")
		return { kind: "forbidden" };
	const account = await findAccountById(getDb(), current.id);
	if (!account) return { kind: "forbidden" };
	const orders = await ordersForAccount(getDb(), current.id);
	return {
		kind: "ok",
		contact: { name: account.name, email: account.email, phone: account.phone },
		orders: orders.map(viewOrder),
	};
}

export async function orderPage(
	session: string,
	id: string,
): Promise<Gate<{ order: OrderView }>> {
	const current = await viewer(session);
	if (!current) return { kind: "anonymous" };
	const row = await readOrderFor(getDb(), current, id);
	if (row === "forbidden") return { kind: "forbidden" };
	if (!row) return { kind: "forbidden" };
	if (
		current.role !== "staff" &&
		current.side === "retail" &&
		row.side !== "retail"
	)
		return { kind: "forbidden" };
	if (
		current.role !== "staff" &&
		current.side === "wholesale" &&
		row.side !== "wholesale"
	)
		return { kind: "forbidden" };
	return { kind: "ok", order: viewOrder(row) };
}

export async function wholesaleDesk(session: string): Promise<
	Gate<{
		status: "active" | "pending" | "rejected";
		legalName: string;
		dba: string;
		businessAddress: string;
		businessPhone: string;
		contactPerson: string;
		website: string;
		resaleCertificate: string;
		taxMask: string;
		netTerms: boolean;
		canOrder: boolean;
		orders: OrderView[];
	}>
> {
	const current = await viewer(session);
	if (!current) return { kind: "anonymous" };
	if (current.role !== "customer" || current.side !== "wholesale")
		return { kind: "forbidden" };
	const account = await findAccountById(getDb(), current.id);
	if (!account) return { kind: "forbidden" };
	const orders = await ordersForAccount(getDb(), current.id);
	return {
		kind: "ok",
		status: account.status,
		legalName: account.legalName,
		dba: account.dba,
		businessAddress: account.businessAddress,
		businessPhone: account.businessPhone,
		contactPerson: account.contactPerson,
		website: account.website,
		resaleCertificate: account.resaleCertificate,
		taxMask: maskForAccount(account),
		netTerms: account.netTerms,
		canOrder: account.status === "active",
		orders: orders.map(viewOrder),
	};
}

export async function staffHome(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const [orderRows, signupRows, pending] = await Promise.all([
		searchOrders(getDb(), {}),
		listSignups(getDb(), {}),
		listWholesale(getDb(), "pending"),
	]);
	return {
		kind: "ok" as const,
		orders: orderRows.length,
		signups: signupRows.length,
		pending: pending.length,
	};
}

export async function staffOrders(
	session: string,
	filter: { q: string; side: string; status: string },
) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const rows = await searchOrders(getDb(), filter);
	return { kind: "ok" as const, orders: rows.map(viewOrder), filter };
}

export async function staffOrder(session: string, id: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const row = await readOrderFor(getDb(), gate.viewer, id);
	if (row === "forbidden" || !row) return { kind: "forbidden" as const };
	const placedBy = row.placedByStaffId
		? await findAccountById(getDb(), row.placedByStaffId)
		: null;
	return {
		kind: "ok" as const,
		order: { ...viewOrder(row), placedByEmail: placedBy?.email ?? null },
	};
}

export async function staffSignups(
	session: string,
	filter: { q: string; status: string },
) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const rows = await listSignups(getDb(), filter);
	return {
		kind: "ok" as const,
		signups: rows.map((row) => ({
			id: row.id,
			email: row.email,
			name: row.name,
			status: row.status,
			createdAt: row.createdAt.toISOString(),
		})),
	};
}

export async function staffWholesaleList(session: string, status: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const rows = await listWholesale(getDb(), status);
	return {
		kind: "ok" as const,
		accounts: rows.map((row) => ({
			id: row.id,
			email: row.email,
			status: row.status,
			legalName: row.legalName,
			contactPerson: row.contactPerson,
			taxMask: maskForAccount(row),
			netTerms: row.netTerms,
		})),
	};
}

export async function staffWholesaleDetail(session: string, id: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const account = await findAccountById(getDb(), id);
	if (account?.side !== "wholesale") return { kind: "forbidden" as const };
	return {
		kind: "ok" as const,
		account: {
			id: account.id,
			email: account.email,
			status: account.status,
			legalName: account.legalName,
			dba: account.dba,
			businessAddress: account.businessAddress,
			businessPhone: account.businessPhone,
			contactPerson: account.contactPerson,
			website: account.website,
			resaleCertificate: account.resaleCertificate,
			taxId: revealTaxId(account, readEnv()),
			taxMask: maskForAccount(account),
			netTerms: account.netTerms,
			listedStore: account.listedStore,
			storeCity: account.storeCity,
			storeState: account.storeState,
			storeZip: account.storeZip,
			storeDirections: account.storeDirections,
		},
	};
}

export async function staffAudit(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const rows = await listAudit(getDb());
	return {
		kind: "ok" as const,
		entries: rows.map((row) => ({
			id: row.id,
			action: row.action,
			subjectType: row.subjectType,
			subjectId: row.subjectId,
			detail: row.detail,
			staffEmail: row.staffEmail,
			createdAt: row.createdAt.toISOString(),
		})),
	};
}

export async function staffCampaign(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const row = await readCampaign(getDb());
	return {
		kind: "ok" as const,
		targetCents: row?.targetCents ?? 0,
		raisedCents: row?.raisedCents ?? 0,
		placeholder: true,
	};
}

export async function devMail() {
	const env = readEnv();
	if (env.resendApiKey)
		return {
			demo: false,
			messages: [] as {
				id: string;
				toEmail: string;
				subject: string;
				body: string;
				createdAt: string;
			}[],
		};
	const rows = await listMail(getDb());
	return {
		demo: true,
		messages: rows.map((row) => ({
			id: row.id,
			toEmail: row.toEmail,
			subject: row.subject,
			body: row.body,
			createdAt: row.createdAt.toISOString(),
		})),
	};
}

export async function runConfirm(token: string) {
	return { result: await confirmSignup(getDb(), token) };
}

export async function runUnsubscribe(token: string) {
	return { result: await unsubscribeToken(getDb(), token) };
}

export async function staffAccountForm(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	return { kind: "ok" as const, tiers: PARTNER_TIERS };
}

export async function staffOrderForm(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const targets = await listDeskTargets(getDb());
	return { kind: "ok" as const, targets };
}

export async function staffCustomers(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const rows = await listRetail(getDb());
	return {
		kind: "ok" as const,
		customers: rows.map((row) => ({
			id: row.id,
			email: row.email,
			name: row.name,
			phone: row.phone,
		})),
	};
}

export async function staffProduct(session: string) {
	const gate = await requireStaff(session);
	if (gate.kind !== "ok") return gate;
	const [product, subscriptionIntervalWeeks] = await Promise.all([
		readProduct(getDb()),
		readSubscriptionInterval(getDb()),
	]);
	return {
		kind: "ok" as const,
		product,
		retailCents: RETAIL_CENTS,
		subscriptionCents: SUBSCRIPTION_CENTS,
		subscriptionIntervalWeeks,
	};
}

export async function requireStaff(
	session: string,
): Promise<Gate<{ viewer: Viewer }>> {
	const current = await viewer(session);
	if (!current) return { kind: "anonymous" };
	if (current.role !== "staff") return { kind: "forbidden" };
	return { kind: "ok", viewer: current };
}
