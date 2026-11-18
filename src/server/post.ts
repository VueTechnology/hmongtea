import { timingSafeEqual } from "node:crypto";
import { readPaymentGate } from "../domain/gate.ts";
import { parseAddress, parseAudience, parseDate, parseDollarsToCents, parseQty, parseRequired, parseSideFilter, parseStatusFilter } from "../domain/validate.ts";
import { approveWholesale, deleteAddress, deleteRejectedWholesale, login, logout, registerRetail, registerWholesale, rejectWholesale, requireCustomer, requireStaff, setNetTerms, setOptOut, updateContact } from "./auth.ts";
import { sendBlast } from "./blasts.ts";
import { updateCampaign } from "./campaign.ts";
import { CSRF_COOKIE, cartSetCookie, clearSessionCookie, parseCookieHeader, readCart, SESSION_COOKIE, sessionCookie } from "./cookies.ts";
import { boot } from "./db.ts";
import { AppError, errorQuery } from "./errors.ts";
import { siteOrigin } from "./mail.ts";
import { cancelOwn, deleteCancelled, exportCsv, markShipped, placeRetail, placeWholesale, staffEdit, updateOwnPreorder } from "./orders.ts";
import { actor } from "./read.ts";
import { accountFromToken } from "./auth.ts";
import { applyOptOut } from "./signups.ts";
import { createSignup, deleteSignup, updateSignupName } from "./signups.ts";
import { applyPaidCheckout, constructStripeEvent, openStripeCheckout } from "./stripe.ts";

function field(form: FormData, key: string) {
	const value = form.get(key);
	return typeof value === "string" ? value : "";
}

function clientIp(request: Request) {
	if (process.env.TRUST_PROXY === "1") {
		const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
		if (forwarded) return forwarded.slice(0, 80);
	}
	return "peer";
}

function assertCsrf(cookie: string | undefined, form: string) {
	if (!cookie || !form || cookie.length !== form.length) throw new AppError("forbidden", "The form expired.", "csrf");
	const left = Buffer.from(cookie);
	const right = Buffer.from(form);
	if (left.length !== right.length || !timingSafeEqual(left, right)) throw new AppError("forbidden", "The form expired.", "csrf");
}

function assertOrigin(request: Request) {
	if (request.headers.get("origin") !== siteOrigin()) throw new AppError("forbidden", "The form expired.", "csrf");
}

export function redirectTo(location: string, cookies: string[] = []) {
	const headers = new Headers();
	headers.set("location", location);
	headers.set("cache-control", "no-store");
	for (const cookie of cookies) headers.append("set-cookie", cookie);
	return new Response(null, { status: 303, headers });
}

async function begin(request: Request) {
	await boot();
	assertOrigin(request);
	const form = await request.formData();
	const cookies = parseCookieHeader(request.headers.get("cookie"));
	assertCsrf(cookies[CSRF_COOKIE], field(form, "csrf"));
	const account = await accountFromToken(cookies[SESSION_COOKIE]);
	return { form, account };
}

function fail(path: string, error: unknown) {
	const join = path.includes("?") ? "&" : "?";
	return redirectTo(`${path}${join}error=${errorQuery(error)}`);
}

function addressOf(form: FormData) {
	return parseAddress({
		line1: field(form, "line1"),
		line2: field(form, "line2"),
		city: field(form, "city"),
		region: field(form, "region"),
		postal: field(form, "postal"),
		country: field(form, "country"),
	});
}

export async function postLogin(request: Request) {
	try {
		const { form } = await begin(request);
		const result = await login(field(form, "email"), field(form, "password"), clientIp(request));
		const next = result.account.role === "staff" ? "/staff" : "/account";
		return redirectTo(next, [sessionCookie(result.token)]);
	} catch (error) {
		return fail("/login", error);
	}
}

export async function postStaffLogin(request: Request) {
	try {
		const { form } = await begin(request);
		const result = await login(field(form, "email"), field(form, "password"), clientIp(request));
		if (result.account.role !== "staff") {
			await logout(result.token);
			throw new AppError("forbidden", "This sign-in is for staff.", "staff");
		}
		return redirectTo("/staff", [sessionCookie(result.token)]);
	} catch (error) {
		return fail("/staff/login", error);
	}
}

export async function postLogout(request: Request) {
	try {
		await begin(request);
		const cookies = parseCookieHeader(request.headers.get("cookie"));
		await logout(cookies[SESSION_COOKIE]);
		return redirectTo("/", [clearSessionCookie()]);
	} catch (error) {
		return fail("/", error);
	}
}

export async function postRegister(request: Request) {
	try {
		const { form } = await begin(request);
		await registerRetail(
			{ email: field(form, "email"), password: field(form, "password"), name: field(form, "name"), phone: field(form, "phone") },
			clientIp(request),
		);
		const result = await login(field(form, "email"), field(form, "password"), clientIp(request));
		return redirectTo("/account", [sessionCookie(result.token)]);
	} catch (error) {
		return fail("/register", error);
	}
}

export async function postWholesaleRegister(request: Request) {
	try {
		const { form } = await begin(request);
		const address = addressOf(form);
		if (!address) throw new AppError("validation", "Complete the address.", "address");
		await registerWholesale(
			{
				email: field(form, "email"),
				password: field(form, "password"),
				legalName: field(form, "legal_name"),
				dba: field(form, "dba"),
				phone: field(form, "phone"),
				contactPerson: field(form, "contact_person"),
				website: field(form, "website"),
				resellerCertificate: field(form, "reseller_certificate"),
				taxId: field(form, "tax_id"),
				address,
			},
			clientIp(request),
		);
		const result = await login(field(form, "email"), field(form, "password"), clientIp(request));
		return redirectTo("/account", [sessionCookie(result.token)]);
	} catch (error) {
		return fail("/wholesale/register", error);
	}
}

export async function postUpdates(request: Request) {
	try {
		const { form } = await begin(request);
		await createSignup(field(form, "email"), field(form, "name"), clientIp(request));
		return redirectTo("/updates?sent=1");
	} catch (error) {
		return fail("/updates", error);
	}
}

export async function postCart(request: Request) {
	try {
		const { form } = await begin(request);
		const intent = field(form, "intent");
		const qty = intent === "remove" ? 0 : parseQty(field(form, "qty"), 1, 99);
		if (intent !== "remove" && qty === null) throw new AppError("validation", "Enter a quantity.", "qty");
		return redirectTo("/cart", [cartSetCookie(qty ? [{ sku: "kuabcha", qty }] : [])]);
	} catch (error) {
		return fail("/cart", error);
	}
}

export async function postCheckout(request: Request) {
	try {
		const { form, account } = await begin(request);
		const customer = requireCustomer(account);
		if (customer.accountType === "wholesale") return redirectTo("/wholesale/order");
		const address = addressOf(form);
		if (!address) throw new AppError("validation", "Complete the address.", "address");
		const qty = readCart(request.headers.get("cookie"))[0]?.qty ?? 0;
		const order = await placeRetail(customer, qty, field(form, "contact_name") || customer.name, field(form, "contact_phone") || customer.phone, address);
		const gate = readPaymentGate(process.env);
		if (gate.kind === "stripe_test") {
			const url = await openStripeCheckout({
				secretKey: gate.secretKey,
				orderId: order.id,
				email: order.contactEmail,
				qty: order.qty,
				unitCents: order.unitCents,
				origin: siteOrigin(),
			});
			return redirectTo(url, [cartSetCookie([])]);
		}
		return redirectTo(`/account/orders/${order.id}?placed=1`, [cartSetCookie([])]);
	} catch (error) {
		return fail("/checkout", error);
	}
}

export async function postWholesaleOrder(request: Request) {
	try {
		const { form, account } = await begin(request);
		const customer = requireCustomer(account);
		const qty = parseQty(field(form, "qty"), 12);
		if (qty === null) throw new AppError("validation", "Enter a whole number of packs within the minimum.", "qty");
		const address = addressOf(form);
		if (!address) throw new AppError("validation", "Complete the address.", "address");
		const order = await placeWholesale(customer, qty, field(form, "contact_name") || customer.name, field(form, "contact_phone") || customer.phone, address);
		return redirectTo(`/account/orders/${order.id}?placed=1`);
	} catch (error) {
		return fail("/wholesale/order", error);
	}
}

export async function postAccount(request: Request) {
	try {
		const { form, account } = await begin(request);
		const customer = requireCustomer(account);
		const intent = field(form, "intent");
		if (intent === "delete-address") {
			await deleteAddress(customer);
			return redirectTo("/account?saved=1");
		}
		if (intent === "optout") {
			await setOptOut(customer, true);
			await applyOptOut(customer.email);
			return redirectTo("/account?saved=1");
		}
		if (intent === "optin") {
			await setOptOut(customer, false);
			return redirectTo("/account?saved=1");
		}
		await updateContact(customer, { name: field(form, "name"), phone: field(form, "phone"), email: field(form, "email") });
		return redirectTo("/account?saved=1");
	} catch (error) {
		return fail("/account", error);
	}
}

export async function postCustomerOrder(request: Request) {
	let id = "";
	try {
		const { form, account } = await begin(request);
		id = field(form, "id");
		const customer = requireCustomer(account);
		if (field(form, "intent") === "cancel") {
			await cancelOwn(customer, id);
			return redirectTo(`/account/orders/${id}?cancelled=1`);
		}
		const address = addressOf(form);
		if (!address) throw new AppError("validation", "Complete the address.", "address");
		await updateOwnPreorder(customer, id, field(form, "contact_name"), field(form, "contact_phone"), field(form, "contact_email"), address);
		return redirectTo(`/account/orders/${id}?saved=1`);
	} catch (error) {
		return fail(id ? `/account/orders/${id}` : "/account", error);
	}
}

export async function postStaffOrder(request: Request) {
	let id = "";
	try {
		const { form, account } = await begin(request);
		id = field(form, "id");
		const staff = requireStaff(account);
		const intent = field(form, "intent");
		if (intent === "delete") {
			await deleteCancelled(staff, id);
			return redirectTo("/staff/orders?deleted=1");
		}
		if (intent === "ship") {
			const shipDate = parseDate(field(form, "ship_date"));
			const tracking = parseRequired(field(form, "tracking_number"), 80);
			if (!shipDate || !tracking) throw new AppError("validation", "Enter a ship date and a tracking number.", "tracking");
			await markShipped(staff, id, shipDate, tracking);
			return redirectTo(`/staff/orders/${id}?shipped=1`);
		}
		const address = addressOf(form);
		if (!address) throw new AppError("validation", "Complete the address.", "address");
		await staffEdit(staff, id, field(form, "contact_name"), field(form, "contact_phone"), field(form, "contact_email"), address);
		return redirectTo(`/staff/orders/${id}?saved=1`);
	} catch (error) {
		return fail(id ? `/staff/orders/${id}` : "/staff/orders", error);
	}
}

export async function postSignups(request: Request) {
	try {
		const { form, account } = await begin(request);
		const staff = requireStaff(account);
		const id = field(form, "id");
		if (field(form, "intent") === "delete") await deleteSignup(staff, id);
		else await updateSignupName(staff, id, field(form, "name"));
		return redirectTo("/staff/signups?saved=1");
	} catch (error) {
		return fail("/staff/signups", error);
	}
}

export async function postBlast(request: Request) {
	try {
		const { form, account } = await begin(request);
		const staff = requireStaff(account);
		const audience = parseAudience(field(form, "audience"));
		if (!audience) throw new AppError("validation", "Choose an audience.", "invalid");
		await sendBlast(staff, audience, field(form, "subject"), field(form, "body"));
		return redirectTo("/staff/blasts?sent=1");
	} catch (error) {
		return fail("/staff/blasts", error);
	}
}

export async function postPeople(request: Request) {
	try {
		const { form, account } = await begin(request);
		const staff = requireStaff(account);
		const id = field(form, "id");
		const intent = field(form, "intent");
		if (intent === "approve") await approveWholesale(staff, id);
		else if (intent === "reject") await rejectWholesale(staff, id);
		else if (intent === "delete") await deleteRejectedWholesale(staff, id);
		else if (intent === "net") await setNetTerms(staff, id, field(form, "net_terms") === "1");
		else throw new AppError("validation", "Unknown action.", "invalid");
		return redirectTo("/staff/accounts?saved=1");
	} catch (error) {
		return fail("/staff/accounts", error);
	}
}

export async function postCampaign(request: Request) {
	try {
		const { form, account } = await begin(request);
		const staff = requireStaff(account);
		const target = parseDollarsToCents(field(form, "target"));
		const raised = parseDollarsToCents(field(form, "raised"));
		if (target === null || raised === null || target <= 0) throw new AppError("validation", "Enter a target above zero.", "invalid");
		await updateCampaign(staff, target, raised);
		return redirectTo("/staff/campaign?saved=1");
	} catch (error) {
		return fail("/staff/campaign", error);
	}
}

export async function getExport(request: Request) {
	try {
		await boot();
		const account = await actor(request);
		const staff = requireStaff(account);
		const url = new URL(request.url);
		const csv = await exportCsv(staff, {
			q: (url.searchParams.get("q") ?? "").slice(0, 80),
			status: parseStatusFilter(url.searchParams.get("status")),
			side: parseSideFilter(url.searchParams.get("side")),
		});
		return new Response(csv, {
			headers: {
				"content-type": "text/csv; charset=utf-8",
				"content-disposition": "attachment; filename=\"preorders.csv\"",
				"cache-control": "no-store",
			},
		});
	} catch {
		return redirectTo("/staff/login");
	}
}

export async function postStripe(request: Request) {
	await boot();
	const gate = readPaymentGate(process.env);
	if (gate.kind !== "stripe_test" || !gate.webhookSecret) return new Response("rejected", { status: 400 });
	try {
		const event = await constructStripeEvent(await request.text(), request.headers.get("stripe-signature") ?? "", gate.webhookSecret, gate.secretKey);
		await applyPaidCheckout(event);
		return new Response("ok", { status: 200 });
	} catch {
		return new Response("rejected", { status: 400 });
	}
}

export async function getHealth() {
	await boot();
	return new Response("ok\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

