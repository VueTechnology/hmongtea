import { getDb } from "#/db/client";
import { parseCartQty } from "#/domain/cart";
import { parseEin } from "#/domain/ein";
import { readPaymentGate } from "#/domain/payment-gate";
import { portalHome, portalOf } from "#/domain/portal";
import { parsePartnerTier } from "#/domain/prices";
import { newToken, tokenEquals } from "#/domain/secret";
import { paidOrderId, readStripeEvent } from "#/domain/stripe-event";
import {
	parseAddress,
	parseDate,
	parseDollarsToCents,
	parseEmail,
	parseName,
	parsePassword,
	parsePhone,
	parseQty,
	parseText,
	parseTracking,
	parseWebsite,
} from "#/domain/validate";
import {
	CART_COOKIE,
	CSRF_COOKIE,
	cartCookie,
	clearCartCookie,
	clearSessionCookie,
	csrfCookie,
	readCookie,
	SESSION_COOKIE,
	sessionCookie,
} from "#/server/cookies";
import { type AppEnv, readEnv } from "#/server/env";
import { verifyPassword } from "#/server/passwords";
import { consumeRateLimit } from "#/server/rate";
import {
	completeReset,
	createDeskAccount,
	placeDeskOrder,
	requestPublicReset,
	sendDeskReset,
} from "#/server/staff-desk";
import {
	audit,
	cancelOrder,
	clearCart,
	createAccount,
	deleteCancelledOrder,
	deleteSession,
	deleteSignup,
	findAccountByEmail,
	findAccountById,
	findViewer,
	getOrder,
	insertOrder,
	markOrderPaid,
	openSession,
	ordersToCsv,
	quoteForAccount,
	readCartQty,
	readOrderFor,
	requestSignup,
	StockShort,
	searchOrders,
	sendBlast,
	setAccountStatus,
	setCart,
	setNetTerms,
	setStock,
	shipOrder,
	updateAccountContact,
	updateCampaign,
	updateOrderDetails,
	updateSignup,
	type Viewer,
} from "#/server/store";

export type { Viewer };

function fieldsOf(form: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of form.entries()) {
		if (typeof value === "string") out[key] = value;
	}
	return out;
}

export function redirect(location: string, cookies: string[] = []): Response {
	const headers = new Headers();
	headers.set("location", location);
	headers.set("cache-control", "no-store");
	for (const item of cookies) headers.append("set-cookie", item);
	return new Response(null, { status: 303, headers });
}

export function forbidden(): Response {
	return new Response("Forbidden", {
		status: 403,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "no-store",
		},
	});
}

function tooMany(): Response {
	return new Response("Too many attempts. Wait and try again.", {
		status: 429,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}

function clientKey(request: Request, env: AppEnv): string {
	if (env.allowTestIp) {
		const testIp = request.headers.get("x-hm-client");
		if (testIp && /^[A-Za-z0-9.:_-]{1,80}$/.test(testIp)) return testIp;
	}
	const real = request.headers.get("x-real-ip");
	if (real && /^[A-Za-z0-9.:]{3,80}$/.test(real)) return real;
	return "peer";
}

function originOk(request: Request, env: AppEnv): boolean {
	const origin = request.headers.get("origin");
	if (!origin) return true;
	if (origin === env.appOrigin) return true;
	let sent: URL;
	let allowed: URL;
	try {
		sent = new URL(origin);
		allowed = new URL(env.appOrigin);
	} catch {
		return false;
	}
	if (sent.protocol !== "http:" && sent.protocol !== "https:") return false;
	if (sent.port !== allowed.port) return false;
	const hosts = new Set([
		allowed.hostname,
		"localhost",
		"127.0.0.1",
		"grokbots-ubuntu-desktop-0009",
	]);
	return hosts.has(sent.hostname);
}

function pathOf(request: Request): string {
	const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
	return path;
}

async function viewerOf(request: Request): Promise<Viewer | null> {
	return findViewer(
		getDb(),
		readCookie(request.headers.get("cookie"), SESSION_COOKIE),
	);
}

function csrfOk(
	request: Request,
	field: string,
	viewer: Viewer | null,
): boolean {
	const cookie = readCookie(request.headers.get("cookie"), CSRF_COOKIE);
	if (!cookie || !field || !tokenEquals(cookie, field)) return false;
	if (viewer && !tokenEquals(viewer.csrf, field)) return false;
	return true;
}

function sessionCookies(
	session: { token: string; csrf: string },
	extra: string[] = [],
): string[] {
	return [sessionCookie(session.token), csrfCookie(session.csrf), ...extra];
}

type Door = "retail" | "wholesale" | "staff" | "any";

function doorPath(door: Door): string {
	if (door === "any") return "/login";
	if (door === "staff") return "/staff/login";
	if (door === "wholesale") return "/wholesale/login";
	return "/login";
}

function matchesDoor(
	viewer: { role: string; side: string },
	door: Door,
): boolean {
	if (door === "staff") return viewer.role === "staff";
	if (viewer.role !== "customer") return false;
	if (door === "wholesale") return viewer.side === "wholesale";
	return viewer.side === "retail";
}

async function login(
	request: Request,
	fields: Record<string, string>,
	door: Door,
	env: AppEnv,
): Promise<Response> {
	const email = parseEmail(fields.email);
	const password = fields.password ?? "";
	const back = doorPath(door);
	if (!email || password.length === 0)
		return redirect(`${back}?error=credentials`);
	const hits = await consumeRateLimit(
		getDb(),
		`login:${clientKey(request, env)}:${email}`,
		env.rateLimitMax,
	);
	if (hits > env.rateLimitMax) return tooMany();
	const account = await findAccountByEmail(getDb(), email);
	const portal = account ? portalOf(account) : null;
	const allowed = account
		? door === "any"
			? portal !== null
			: matchesDoor(account, door)
		: false;
	const valid =
		account && allowed
			? await verifyPassword(password, account.passwordHash)
			: false;
	if (!account || !allowed || !valid || !portal)
		return redirect(`${back}?error=credentials`);
	const session = await openSession(getDb(), account.id);
	const extra: string[] = [];
	if (portal === "customer") {
		const qty = parseCartQty(
			readCookie(request.headers.get("cookie"), CART_COOKIE),
		);
		if (qty > 0) await setCart(getDb(), account.id, "retail", qty);
		extra.push(clearCartCookie());
	}
	if (account.role === "staff")
		await audit(getDb(), account.id, "staff.login", "session", account.id);
	const dest = door === "any" ? portalHome(portal) : doorPathHome(door);
	return redirect(dest, sessionCookies(session, extra));
}

function doorPathHome(door: Door): string {
	if (door === "staff") return "/staff";
	if (door === "wholesale") return "/wholesale/desk";
	return "/account";
}

async function registerRetail(
	request: Request,
	fields: Record<string, string>,
	env: AppEnv,
): Promise<Response> {
	const hits = await consumeRateLimit(
		getDb(),
		`signup:${clientKey(request, env)}`,
		env.rateLimitMax,
	);
	if (hits > env.rateLimitMax) return tooMany();
	const email = parseEmail(fields.email);
	const password = parsePassword(fields.password);
	const name = parseName(fields.name, true);
	const phone = parsePhone(fields.phone, false);
	if (!email) return redirect("/register?error=email");
	if (!password) return redirect("/register?error=password");
	if (!name) return redirect("/register?error=name");
	if (phone == null) return redirect("/register?error=phone");
	const created = await createAccount(getDb(), env, {
		email,
		password,
		role: "customer",
		side: "retail",
		status: "active",
		name,
		phone,
	});
	if (!created.ok) return redirect("/register?error=taken");
	const session = await openSession(getDb(), created.id);
	return redirect("/account", sessionCookies(session));
}

async function registerWholesale(
	request: Request,
	fields: Record<string, string>,
	env: AppEnv,
): Promise<Response> {
	const hits = await consumeRateLimit(
		getDb(),
		`signup:${clientKey(request, env)}`,
		env.rateLimitMax,
	);
	if (hits > env.rateLimitMax) return tooMany();
	const email = parseEmail(fields.email);
	const password = parsePassword(fields.password);
	const legalName = parseText(fields.legalName, 160, true);
	const dba = parseText(fields.dba, 160, false);
	const businessAddress = parseText(fields.businessAddress, 300, true);
	const businessPhone = parsePhone(fields.businessPhone, true);
	const contactPerson = parseName(fields.contactPerson, true);
	const website = parseWebsite(fields.website);
	const resale = parseText(fields.resaleCertificate, 80, false);
	const ein = parseEin(fields.ein);
	if (!email) return redirect("/partners?error=email");
	if (!password) return redirect("/partners?error=password");
	if (
		!legalName ||
		!businessAddress ||
		!businessPhone ||
		!contactPerson ||
		dba == null ||
		resale == null
	) {
		return redirect("/partners?error=business");
	}
	if (website == null) return redirect("/partners?error=website");
	if (!ein) return redirect("/partners?error=ein");
	const created = await createAccount(getDb(), env, {
		email,
		password,
		role: "customer",
		side: "wholesale",
		status: "pending",
		name: contactPerson,
		phone: businessPhone,
		legalName,
		dba,
		businessAddress,
		businessPhone,
		contactPerson,
		website,
		resaleCertificate: resale,
		taxId: ein,
	});
	if (!created.ok && created.error === "taken")
		return redirect("/partners?error=taken");
	if (!created.ok) return redirect("/partners?error=ein");
	const session = await openSession(getDb(), created.id);
	return redirect("/wholesale/desk", sessionCookies(session));
}

async function saveCart(
	request: Request,
	fields: Record<string, string>,
	viewer: Viewer | null,
): Promise<Response> {
	const qty = parseQty(fields.qty);
	if (qty == null) return redirect("/cart?error=qty");
	if (viewer?.role === "staff") return redirect("/staff");
	if (viewer?.side === "wholesale")
		return redirect("/wholesale/order?error=retail");
	if (viewer) {
		await setCart(getDb(), viewer.id, "retail", qty);
		return redirect("/cart");
	}
	return redirect("/cart", [
		cartCookie(qty),
		csrfCookie(
			readCookie(request.headers.get("cookie"), CSRF_COOKIE) ?? newToken(),
		),
	]);
}

async function checkout(
	fields: Record<string, string>,
	viewer: Viewer | null,
	env: AppEnv,
): Promise<Response> {
	if (!viewer) return redirect("/login");
	if (viewer.role !== "customer" || viewer.side !== "retail")
		return forbidden();
	const account = await findAccountById(getDb(), viewer.id);
	if (!account) return redirect("/login");
	const qty = await readCartQty(getDb(), viewer.id);
	const name = parseName(fields.contactName, true);
	const phone = parsePhone(fields.phone, false);
	const address = parseAddress(fields);
	if (!name) return redirect("/checkout?error=name");
	if (phone == null) return redirect("/checkout?error=phone");
	if (!address) return redirect("/checkout?error=address");
	const quote = quoteForAccount(account, "retail", qty);
	if (!quote.ok) return redirect("/checkout?error=empty");
	const gate = readPaymentGate({
		STRIPE_SECRET_KEY: env.stripeSecret,
		STRIPE_PUBLISHABLE_KEY: env.stripePublishable,
		STRIPE_WEBHOOK_SECRET: env.stripeWebhook,
	});
	if (gate.kind === "refused") return redirect("/checkout?error=payment");
	const payment = gate.kind === "demo" ? "demo" : "stripe";
	let orderId: string;
	try {
		orderId = await insertOrder(
			getDb(),
			{
				account,
				orderSide: "retail",
				qty,
				contactName: name,
				phone,
				address,
				payment,
			},
			quote.quote,
		);
	} catch (error) {
		if (error instanceof StockShort) return redirect("/checkout?error=stock");
		throw error;
	}
	await clearCart(getDb(), viewer.id);
	if (payment === "stripe")
		return redirect(`/checkout/done?order=${orderId}&payment=stripe`);
	return redirect(`/checkout/done?order=${orderId}`);
}

async function placeWholesale(
	fields: Record<string, string>,
	viewer: Viewer | null,
	env: AppEnv,
): Promise<Response> {
	if (!viewer) return redirect("/login");
	if (viewer.role !== "customer" || viewer.side !== "wholesale")
		return forbidden();
	if (viewer.status !== "active")
		return redirect("/wholesale/desk?error=pending");
	const account = await findAccountById(getDb(), viewer.id);
	if (!account) return redirect("/login");
	const qty = parseQty(fields.qty);
	const name = parseName(fields.contactName, true);
	const phone = parsePhone(fields.phone, false);
	const address = parseAddress(fields);
	if (qty == null) return redirect("/wholesale/order?error=qty");
	if (!name) return redirect("/wholesale/order?error=name");
	if (phone == null) return redirect("/wholesale/order?error=phone");
	if (!address) return redirect("/wholesale/order?error=address");
	const quote = quoteForAccount(account, "wholesale", qty);
	if (!quote.ok && quote.error === "moq")
		return redirect("/wholesale/order?error=moq");
	if (!quote.ok) return redirect("/wholesale/desk?error=pending");
	const gate = readPaymentGate({
		STRIPE_SECRET_KEY: env.stripeSecret,
		STRIPE_PUBLISHABLE_KEY: env.stripePublishable,
		STRIPE_WEBHOOK_SECRET: env.stripeWebhook,
	});
	if (gate.kind === "refused" && !account.netTerms)
		return redirect("/wholesale/order?error=payment");
	const payment = account.netTerms
		? "net-terms-placeholder"
		: gate.kind === "demo"
			? "demo"
			: "stripe";
	let orderId: string;
	try {
		orderId = await insertOrder(
			getDb(),
			{
				account,
				orderSide: "wholesale",
				qty,
				contactName: name,
				phone,
				address,
				payment,
			},
			quote.quote,
		);
	} catch (error) {
		if (error instanceof StockShort)
			return redirect("/wholesale/order?error=stock");
		throw error;
	}
	return redirect(`/wholesale/orders/${orderId}`);
}

async function saveContact(
	fields: Record<string, string>,
	viewer: Viewer | null,
): Promise<Response> {
	if (viewer?.role !== "customer") return forbidden();
	const name = parseName(fields.name, true);
	const phone = parsePhone(fields.phone, false);
	const email = parseEmail(fields.email);
	const back = viewer.side === "wholesale" ? "/wholesale/desk" : "/account";
	if (!name) return redirect(`${back}?error=name`);
	if (phone == null) return redirect(`${back}?error=phone`);
	if (!email) return redirect(`${back}?error=email`);
	const saved = await updateAccountContact(getDb(), viewer.id, {
		name,
		phone,
		email,
	});
	if (saved === "taken") return redirect(`${back}?error=taken`);
	return redirect(`${back}?saved=1`);
}

async function customerOrderPost(
	id: string,
	fields: Record<string, string>,
	viewer: Viewer | null,
): Promise<Response> {
	if (viewer?.role !== "customer") return forbidden();
	const access = await readOrderFor(getDb(), viewer, id);
	if (access === "forbidden") return forbidden();
	if (!access) return new Response("Not found", { status: 404 });
	const back =
		viewer.side === "wholesale"
			? `/wholesale/orders/${id}`
			: `/account/orders/${id}`;
	if (fields.action === "reorder") {
		if (viewer.side === "retail" && access.side === "retail") {
			await setCart(getDb(), viewer.id, "retail", access.qty);
			return redirect("/cart");
		}
		if (viewer.side === "wholesale" && access.side === "wholesale") {
			if (viewer.status !== "active")
				return redirect("/wholesale/desk?error=pending");
			return redirect(`/wholesale/order?q=${access.qty}`);
		}
		return forbidden();
	}
	if (fields.action === "cancel") {
		const result = await cancelOrder(getDb(), id, viewer.id);
		if (result === "forbidden") return forbidden();
		if (result === "closed") return redirect(`${back}?error=shipped`);
		return redirect(`${back}?cancelled=1`);
	}
	const name = parseName(fields.contactName, true);
	const phone = parsePhone(fields.phone, false);
	const address = parseAddress(fields);
	if (!name || phone == null || !address)
		return redirect(`${back}?error=address`);
	const account = await findAccountById(getDb(), viewer.id);
	if (!account) return forbidden();
	const result = await updateOrderDetails(getDb(), id, {
		contactName: name,
		contactPhone: phone,
		address,
		account,
	});
	if (result === "closed") return redirect(`${back}?error=shipped`);
	return redirect(`${back}?saved=1`);
}

async function staffOrderPost(
	id: string,
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const back = `/staff/orders/${id}`;
	const current = await getOrder(getDb(), id);
	if (!current) return new Response("Not found", { status: 404 });
	if (fields.action === "ship") {
		const shipDate = parseDate(fields.shipDate);
		const tracking = parseTracking(fields.tracking);
		if (!shipDate || !tracking) return redirect(`${back}?error=tracking`);
		const result = await shipOrder(getDb(), id, shipDate, tracking);
		if (result !== "ok") return redirect(`${back}?error=shipped`);
		await audit(getDb(), viewer.id, "order.ship", "order", id, tracking);
		return redirect(`${back}?shipped=1`);
	}
	if (fields.action === "cancel") {
		const result = await cancelOrder(getDb(), id, null);
		if (result === "closed") return redirect(`${back}?error=shipped`);
		await audit(getDb(), viewer.id, "order.cancel", "order", id);
		return redirect(`${back}?cancelled=1`);
	}
	if (fields.action === "delete") {
		const result = await deleteCancelledOrder(getDb(), id);
		if (result !== "ok") return redirect(`${back}?error=closed`);
		await audit(getDb(), viewer.id, "order.delete", "order", id);
		return redirect("/staff/orders?deleted=1");
	}
	const name = parseName(fields.contactName, true);
	const phone = parsePhone(fields.phone, false);
	const address = parseAddress(fields);
	const qty = parseQty(fields.qty);
	if (!name || phone == null || !address || qty == null || qty < 1)
		return redirect(`${back}?error=address`);
	const account = await findAccountById(getDb(), current.accountId);
	if (!account) return redirect(`${back}?error=address`);
	const result = await updateOrderDetails(getDb(), id, {
		contactName: name,
		contactPhone: phone,
		address,
		qty,
		account,
	});
	if (result === "closed") return redirect(`${back}?error=shipped`);
	if (result === "qty") return redirect(`${back}?error=qty`);
	await audit(getDb(), viewer.id, "order.update", "order", id);
	return redirect(`${back}?saved=1`);
}

async function staffSignupPost(
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const id = fields.id ?? "";
	if (fields.action === "delete") {
		const removed = await deleteSignup(getDb(), id);
		if (!removed) return redirect("/staff/signups?error=missing");
		await audit(getDb(), viewer.id, "signup.delete", "signup", id);
		return redirect("/staff/signups?deleted=1");
	}
	const name = parseName(fields.name, false);
	const status = fields.status;
	if (name == null) return redirect("/staff/signups?error=name");
	if (
		status !== "pending" &&
		status !== "confirmed" &&
		status !== "unsubscribed"
	) {
		return redirect("/staff/signups?error=status");
	}
	const saved = await updateSignup(getDb(), id, { name, status });
	if (!saved) return redirect("/staff/signups?error=missing");
	await audit(getDb(), viewer.id, "signup.update", "signup", id, status);
	return redirect("/staff/signups?saved=1");
}

async function staffWholesalePost(
	id: string,
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const back = `/staff/wholesale/${id}`;
	if (fields.action === "approve") {
		const ok = await setAccountStatus(getDb(), id, "active");
		if (!ok) return redirect(`${back}?error=missing`);
		await audit(getDb(), viewer.id, "wholesale.approve", "account", id);
		return redirect(`${back}?saved=1`);
	}
	if (fields.action === "reject") {
		const ok = await setAccountStatus(getDb(), id, "rejected");
		if (!ok) return redirect(`${back}?error=missing`);
		await audit(getDb(), viewer.id, "wholesale.reject", "account", id);
		return redirect(`${back}?saved=1`);
	}
	const ok = await setNetTerms(getDb(), id, fields.netTerms === "1");
	if (!ok) return redirect(`${back}?error=pending`);
	await audit(
		getDb(),
		viewer.id,
		"wholesale.net_terms",
		"account",
		id,
		fields.netTerms === "1" ? "on" : "off",
	);
	return redirect(`${back}?saved=1`);
}

async function blastPost(
	fields: Record<string, string>,
	viewer: Viewer,
	env: AppEnv,
): Promise<Response> {
	const audience =
		fields.audience === "updates"
			? "updates"
			: fields.audience === "preorder"
				? "preorder"
				: null;
	const subject = parseText(fields.subject, 200, true);
	const body = typeof fields.body === "string" ? fields.body.trim() : "";
	if (!audience || !subject || body.length === 0 || body.length > 20000)
		return redirect("/staff/blasts?error=subject");
	const result = await sendBlast(getDb(), env, viewer.id, {
		audience,
		subject,
		body,
	});
	return redirect(`/staff/blasts?sent=${result.count}`);
}

async function campaignPost(
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const target = parseDollarsToCents(fields.target);
	const raised = parseDollarsToCents(fields.raised);
	if (target == null || target < 100 || raised == null)
		return redirect("/staff/campaign?error=amount");
	await updateCampaign(getDb(), target, raised);
	await audit(
		getDb(),
		viewer.id,
		"campaign.update",
		"campaign",
		"1",
		`${target}:${raised}`,
	);
	return redirect("/staff/campaign?saved=1");
}

function isStaffPath(path: string): boolean {
	return path.startsWith("/staff") && path !== "/staff/login";
}

function staffBack(value: string | undefined): string {
	if (value === "/staff/customers" || value === "/staff/accounts") return value;
	if (value && /^\/staff\/wholesale\/[0-9a-f-]{36}$/i.test(value)) return value;
	return "/staff/customers";
}

async function forgotPassword(
	request: Request,
	fields: Record<string, string>,
	env: AppEnv,
): Promise<Response> {
	const hits = await consumeRateLimit(
		getDb(),
		`reset:${clientKey(request, env)}`,
		env.rateLimitMax,
	);
	if (hits > env.rateLimitMax) return tooMany();
	const email = parseEmail(fields.email);
	if (email) await requestPublicReset(getDb(), env, email);
	return redirect("/forgot?reset=1");
}

async function resetPassword(
	fields: Record<string, string>,
): Promise<Response> {
	const token = fields.token ?? "";
	const password = parsePassword(fields.password);
	if (!password) return redirect("/reset?error=password");
	const result = await completeReset(getDb(), token, password);
	if (result !== "ok") return redirect("/reset?error=token");
	return redirect("/login?saved=1");
}

async function staffCreatePost(
	fields: Record<string, string>,
	viewer: Viewer,
	env: AppEnv,
): Promise<Response> {
	const name = parseName(fields.name, true);
	const email = parseEmail(fields.email);
	const phone = parsePhone(fields.phone, true);
	const role =
		fields.role === "partner"
			? "partner"
			: fields.role === "customer"
				? "customer"
				: null;
	const sendLink = fields.sendPassword === "1";
	const password = sendLink ? null : parsePassword(fields.password);
	const company = parseText(fields.company, 160, role === "partner");
	const tier = parsePartnerTier(fields.tier);
	if (!email) return redirect("/staff/accounts?error=email");
	if (!name) return redirect("/staff/accounts?error=name");
	if (phone == null) return redirect("/staff/accounts?error=phone");
	if (!role) return redirect("/staff/accounts?error=role");
	if (role === "partner" && !company)
		return redirect("/staff/accounts?error=company");
	if (role === "partner" && !tier)
		return redirect("/staff/accounts?error=tier");
	if (!sendLink && !password) return redirect("/staff/accounts?error=password");
	const created = await createDeskAccount(getDb(), env, viewer.id, {
		name,
		email,
		phone,
		role,
		company: company ?? "",
		tier: role === "partner" ? tier : null,
		password,
	});
	if (!created.ok && created.error === "taken")
		return redirect("/staff/accounts?error=taken");
	if (!created.ok) return redirect("/staff/accounts?error=tier");
	return redirect("/staff/accounts?saved=1");
}

async function staffBehalfPost(
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const accountId = fields.accountId ?? "";
	const qty = parseQty(fields.qty);
	const name = parseName(fields.contactName, true);
	const phone = parsePhone(fields.phone, false);
	const address = parseAddress(fields);
	if (!/^[0-9a-f-]{36}$/i.test(accountId))
		return redirect("/staff/orders/new?error=missing");
	if (qty == null || qty < 1) return redirect("/staff/orders/new?error=qty");
	if (!name) return redirect("/staff/orders/new?error=name");
	if (phone == null) return redirect("/staff/orders/new?error=phone");
	if (!address) return redirect("/staff/orders/new?error=address");
	const placed = await placeDeskOrder(getDb(), viewer.id, {
		accountId,
		qty,
		contactName: name,
		phone,
		address,
	});
	if (!placed.ok) return redirect(`/staff/orders/new?error=${placed.error}`);
	return redirect(`/staff/orders/${placed.orderId}`);
}

async function staffResetPost(
	fields: Record<string, string>,
	viewer: Viewer,
	env: AppEnv,
): Promise<Response> {
	const email = parseEmail(fields.email);
	const back = staffBack(fields.back);
	if (!email) return redirect(`${back}?error=email`);
	const sent = await sendDeskReset(getDb(), env, viewer.id, email);
	if (sent === "missing") return redirect(`${back}?error=missing`);
	return redirect(`${back}?saved=1`);
}

export async function handlePost(request: Request): Promise<Response> {
	const env = readEnv();
	if (!originOk(request, env)) return forbidden();
	const path = pathOf(request);
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return new Response("Bad request", { status: 400 });
	}
	const fields = fieldsOf(form);
	const viewer = await viewerOf(request);
	if (isStaffPath(path)) {
		if (!viewer) return redirect("/login");
		if (viewer.role !== "staff") return forbidden();
	}
	if (!csrfOk(request, fields.csrf ?? "", viewer)) {
		const back = path === "/" ? "/" : path;
		return redirect(`${back}?error=csrf`);
	}
	if (path === "/login") return login(request, fields, "any", env);
	if (path === "/forgot") return forgotPassword(request, fields, env);
	if (path === "/reset") return resetPassword(fields);
	if (path === "/wholesale/login")
		return login(request, fields, "wholesale", env);
	if (path === "/staff/login") return login(request, fields, "staff", env);
	if (path === "/register") return registerRetail(request, fields, env);
	if (path === "/wholesale/register")
		return registerWholesale(request, fields, env);
	if (path === "/logout") {
		const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
		if (token) await deleteSession(getDb(), token);
		return redirect("/", [clearSessionCookie(), csrfCookie(newToken())]);
	}
	if (path === "/updates") {
		const hits = await consumeRateLimit(
			getDb(),
			`signup:${clientKey(request, env)}`,
			env.rateLimitMax,
		);
		if (hits > env.rateLimitMax) return tooMany();
		const email = parseEmail(fields.email);
		const name = parseName(fields.name, false);
		if (!email) return redirect("/?error=email");
		if (name == null) return redirect("/?error=name");
		const result = await requestSignup(getDb(), env, { email, name });
		if (result === "unsubscribed") return redirect("/?error=unsubscribed");
		if (result === "already") return redirect("/?joined=already");
		return redirect("/?joined=1");
	}
	if (path === "/cart") return saveCart(request, fields, viewer);
	if (path === "/checkout") return checkout(fields, viewer, env);
	if (path === "/wholesale/order") return placeWholesale(fields, viewer, env);
	if (path === "/account" || path === "/wholesale/desk")
		return saveContact(fields, viewer);
	const customerOrder = path.match(
		/^\/(?:account|wholesale)\/orders\/([0-9a-f-]{36})$/i,
	);
	if (customerOrder?.[1])
		return customerOrderPost(customerOrder[1], fields, viewer);
	if (viewer?.role !== "staff") return forbidden();
	const staffOrder = path.match(/^\/staff\/orders\/([0-9a-f-]{36})$/i);
	if (staffOrder?.[1]) return staffOrderPost(staffOrder[1], fields, viewer);
	const staffWholesale = path.match(/^\/staff\/wholesale\/([0-9a-f-]{36})$/i);
	if (staffWholesale?.[1])
		return staffWholesalePost(staffWholesale[1], fields, viewer);
	if (path === "/staff/accounts") return staffCreatePost(fields, viewer, env);
	if (path === "/staff/orders/new") return staffBehalfPost(fields, viewer);
	if (path === "/staff/password-reset")
		return staffResetPost(fields, viewer, env);
	if (path === "/staff/signups") return staffSignupPost(fields, viewer);
	if (path === "/staff/blasts") return blastPost(fields, viewer, env);
	if (path === "/staff/campaign") return campaignPost(fields, viewer);
	if (path === "/staff/products") return staffProductPost(fields, viewer);
	return new Response("Not found", { status: 404 });
}

async function staffProductPost(
	fields: Record<string, string>,
	viewer: Viewer,
): Promise<Response> {
	const onHand = Number(fields.onHand);
	if (!Number.isInteger(onHand)) return redirect("/staff/products?error=stock");
	const saved = await setStock(getDb(), onHand);
	if (!saved) return redirect("/staff/products?error=stock");
	await audit(
		getDb(),
		viewer.id,
		"product.stock",
		"product",
		"KUABCHA-PACK",
		String(onHand),
	);
	return redirect("/staff/products?saved=1");
}

export async function handleExport(request: Request): Promise<Response> {
	const viewer = await viewerOf(request);
	if (!viewer) return redirect("/login");
	if (viewer.role !== "staff") return forbidden();
	const url = new URL(request.url);
	const rows = await searchOrders(getDb(), {
		q: url.searchParams.get("q") ?? "",
		side: url.searchParams.get("side") ?? "",
		status: url.searchParams.get("status") ?? "",
	});
	await audit(
		getDb(),
		viewer.id,
		"export.csv",
		"order",
		"",
		String(rows.length),
	);
	return new Response(ordersToCsv(rows), {
		status: 200,
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": 'attachment; filename="orders.csv"',
			"cache-control": "no-store",
		},
	});
}

export async function handleWebhook(request: Request): Promise<Response> {
	const env = readEnv();
	const gate = readPaymentGate({
		STRIPE_SECRET_KEY: env.stripeSecret,
		STRIPE_PUBLISHABLE_KEY: env.stripePublishable,
		STRIPE_WEBHOOK_SECRET: env.stripeWebhook,
	});
	if (gate.kind !== "stripe-test" || !gate.webhookSecret)
		return new Response("rejected", { status: 400 });
	const raw = await request.text();
	const signature = request.headers.get("stripe-signature") ?? "";
	try {
		const event = await readStripeEvent(raw, signature, gate.webhookSecret);
		const orderId = paidOrderId(event);
		if (orderId) await markOrderPaid(getDb(), orderId);
	} catch {
		return new Response("rejected", { status: 400 });
	}
	return new Response("ok", { status: 200 });
}

export async function issueCsrf(): Promise<{ token: string; cookie: string }> {
	const token = newToken();
	return { token, cookie: csrfCookie(token) };
}
