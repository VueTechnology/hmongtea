import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";
import Stripe from "stripe";
import { openDatabase, type Sql } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { readCsrfToken, readSessionToken } from "../src/server/cookies";
import { readEnv } from "../src/server/env";

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) throw new Error("DATABASE_URL is required");
const testUrl = adminUrl.replace(/\/[^/?]+$/, "/hmongtea_test");

const retailPassword = `retail-${randomUUID()}`;
const otherPassword = `other-${randomUUID()}`;
const wholesalePassword = `wholesale-${randomUUID()}`;
const staffPassword = `staff-${randomUUID()}`;
const taxKey = randomBytes(32).toString("base64");

const address = {
	line1: "12 Tea Road",
	line2: "",
	city: "Chiang Rai",
	region: "Chiang Rai",
	postalCode: "57000",
	country: "TH",
	phone: "5550100000",
};

let sql: Sql;
let close: () => Promise<void>;

beforeAll(async () => {
	const admin = postgres(adminUrl, { max: 1 });
	await admin.unsafe(
		"select pg_terminate_backend(pid) from pg_stat_activity where datname = 'hmongtea_test' and pid <> pg_backend_pid()",
	);
	await admin.unsafe("drop database if exists hmongtea_test");
	await admin.unsafe("create database hmongtea_test");
	await admin.end();
	process.env.DATABASE_URL = testUrl;
	process.env.APP_ORIGIN = "http://127.0.0.1:3190";
	process.env.TAX_ID_KEY = taxKey;
	process.env.ALLOW_TEST_IP = "1";
	process.env.RATE_LIMIT_MAX = "30";
	process.env.STAFF_EMAIL = "staff@hmongtea.com";
	process.env.STAFF_PASSWORD = staffPassword;
	process.env.RESEND_API_KEY = "";
	process.env.STRIPE_SECRET_KEY = "";
	process.env.STRIPE_PUBLISHABLE_KEY = "";
	process.env.STRIPE_WEBHOOK_SECRET = "";
	const opened = openDatabase(testUrl, 4);
	sql = opened.sql;
	close = opened.close;
});

afterAll(async () => {
	await close();
});

function post(
	path: string,
	form: Record<string, string>,
	cookie: string,
	ip = "203.0.113.10",
): Request {
	return new Request(`http://127.0.0.1:3190${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			origin: "http://127.0.0.1:3190",
			cookie,
			"x-hm-client": ip,
		},
		body: new URLSearchParams(form),
	});
}

function jar(response: Response, previous = ""): string {
	const map = new Map<string, string>();
	for (const part of previous.split(";")) {
		const eq = part.indexOf("=");
		if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
	}
	for (const line of response.headers.getSetCookie()) {
		const first = line.split(";")[0] ?? "";
		const eq = first.indexOf("=");
		if (eq > 0) map.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
	}
	return [...map.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function csrfOf(cookie: string): string {
	return readCsrfToken(cookie) ?? "";
}

function mailToken(body: string, path: string): string {
	const match = body.match(new RegExp(`${path}\\?token=([^\\s]+)`));
	if (!match?.[1]) throw new Error(`missing ${path} token`);
	return match[1];
}

test("postgres backend", async () => {
	const actions = await import("../src/server/actions");
	const pages = await import("../src/server/pages");
	const store = await import("../src/server/store");
	const { handlePost, handleExport, handleWebhook, issueCsrf } = actions;

	const before = await sql`select to_regclass('public.accounts') as name`;
	expect(before[0]?.name).toBeNull();
	await migrate(sql);
	const after = await sql`select to_regclass('public.accounts') as name`;
	expect(after[0]?.name).toBe("accounts");
	await migrate(sql);
	const campaignRows = await sql<
		{ n: number }[]
	>`select count(*)::int as n from campaign`;
	expect(Number(campaignRows[0]?.n)).toBe(1);
	const placeholder = await sql<
		{ placeholder: boolean }[]
	>`select placeholder from campaign where id = 1`;
	expect(placeholder[0]?.placeholder).toBe(true);

	await expect(
		sql.unsafe(
			`insert into accounts (id, email, password_hash, role, side, status) values ('${randomUUID()}', 'bad-role@example.com', 'x', 'owner', 'retail', 'active')`,
		),
	).rejects.toThrow();
	await expect(
		sql.unsafe(
			"insert into campaign (id, target_cents, raised_cents, placeholder) values (2, 1, 0, true)",
		),
	).rejects.toThrow();
	await expect(
		sql.unsafe("update campaign set placeholder = false where id = 1"),
	).rejects.toThrow();

	const env = readEnv();
	const skipped = await store.ensureStaff(storeFindDb(), {
		...env,
		staffPassword: "short",
	});
	expect(skipped.created).toBe(false);

	function storeFindDb() {
		return openDatabase(testUrl, 1).db;
	}

	const db = storeFindDb();
	const staff = await store.ensureStaff(db, env);
	expect(staff.created).toBe(true);
	expect((await store.ensureStaff(db, env)).created).toBe(false);
	const staffRow = await store.findAccountByEmail(db, "staff@hmongtea.com");
	expect(staffRow?.passwordHash.startsWith("$argon2id$")).toBe(true);
	expect(
		await import("../src/server/passwords").then((mod) =>
			mod.verifyPassword(staffPassword, staffRow?.passwordHash ?? ""),
		),
	).toBe(true);

	const issued = await issueCsrf();
	let retailCookie = issued.cookie;
	const registered = await handlePost(
		post(
			"/register",
			{
				csrf: issued.token,
				email: "ada@example.com",
				password: retailPassword,
				name: "Ada",
				phone: "",
			},
			retailCookie,
		),
	);
	expect(registered.status).toBe(303);
	expect(registered.headers.get("location")).toBe("/account");
	const setCookies = registered.headers.getSetCookie().join("\n");
	expect(setCookies).toContain("HttpOnly");
	expect(setCookies).toContain("SameSite=Lax");
	expect(setCookies).toContain("hmongtea_session=");
	expect(setCookies).not.toContain("Secure");
	expect(setCookies).not.toContain("__Host-");
	retailCookie = jar(registered, retailCookie);

	const duplicate = await handlePost(
		post(
			"/register",
			{
				csrf: csrfOf(retailCookie),
				email: "ada@example.com",
				password: retailPassword,
				name: "Ada",
				phone: "",
			},
			retailCookie,
			"203.0.113.11",
		),
	);
	expect(duplicate.headers.get("location")).toContain("error=taken");

	const badEin = await handlePost(
		post(
			"/wholesale/register",
			{
				csrf: csrfOf(retailCookie),
				email: "shop@example.com",
				password: wholesalePassword,
				legalName: "Tea Shop LLC",
				dba: "",
				businessAddress: "9 Market Street",
				businessPhone: "5550102222",
				contactPerson: "Mina",
				website: "",
				resaleCertificate: "",
				ein: "12-345",
			},
			retailCookie,
			"203.0.113.12",
		),
	);
	expect(badEin.headers.get("location")).toContain("error=ein");

	const wholesaleIssued = await issueCsrf();
	const wholesaleReg = await handlePost(
		post(
			"/wholesale/register",
			{
				csrf: wholesaleIssued.token,
				email: "shop@example.com",
				password: wholesalePassword,
				legalName: "Tea Shop LLC",
				dba: "Tea Shop",
				businessAddress: "9 Market Street",
				businessPhone: "5550102222",
				contactPerson: "Mina",
				website: "https://teashop.example",
				resaleCertificate: "RC-100",
				ein: "12-3456789",
			},
			wholesaleIssued.cookie,
			"203.0.113.13",
		),
	);
	expect(wholesaleReg.headers.get("location")).toBe("/wholesale/desk");
	const wholesaleCookie = jar(wholesaleReg, wholesaleIssued.cookie);
	const cipher = await sql<{ tax_id_cipher: string; tax_id_last4: string }[]>`
		select tax_id_cipher, tax_id_last4 from accounts where email = 'shop@example.com'
	`;
	expect(cipher[0]?.tax_id_cipher.includes("123456789")).toBe(false);
	expect(cipher[0]?.tax_id_cipher.includes("12-3456789")).toBe(false);
	expect(cipher[0]?.tax_id_last4).toBe("6789");

	const pendingOrder = await handlePost(
		post(
			"/wholesale/order",
			{
				csrf: csrfOf(wholesaleCookie),
				qty: "12",
				contactName: "Mina",
				...address,
			},
			wholesaleCookie,
			"203.0.113.14",
		),
	);
	expect(pendingOrder.status).toBe(303);
	expect(pendingOrder.headers.get("location")).toContain("error=pending");
	const pendingDesk = await pages.wholesaleDesk(
		readSessionToken(wholesaleCookie) ?? "",
	);
	expect(pendingDesk.kind).toBe("ok");
	if (pendingDesk.kind === "ok") {
		expect(pendingDesk.canOrder).toBe(false);
		expect(pendingDesk.taxMask).toBe("••-•••6789");
		expect("taxId" in pendingDesk).toBe(false);
	}

	const retailOnWholesale = await handlePost(
		post(
			"/wholesale/order",
			{ csrf: csrfOf(retailCookie), qty: "12", contactName: "Ada", ...address },
			retailCookie,
			"203.0.113.15",
		),
	);
	expect(retailOnWholesale.status).toBe(403);
	const retailDesk = await pages.wholesaleDesk(
		readSessionToken(retailCookie) ?? "",
	);
	expect(retailDesk.kind).toBe("forbidden");

	const added = await handlePost(
		post(
			"/cart",
			{ csrf: csrfOf(retailCookie), qty: "1" },
			retailCookie,
			"203.0.113.16",
		),
	);
	expect(added.headers.get("location")).toBe("/cart");
	const checked = await handlePost(
		post(
			"/checkout",
			{ csrf: csrfOf(retailCookie), contactName: "Ada", ...address },
			retailCookie,
			"203.0.113.17",
		),
	);
	expect(checked.status).toBe(303);
	const placedUrl = new URL(
		checked.headers.get("location") ?? "",
		"http://127.0.0.1:3190",
	);
	const placedId = placedUrl.searchParams.get("order") ?? "";
	expect(placedId).toMatch(/[0-9a-f-]{36}/);
	const placed = await store.getOrder(db, placedId);
	expect(placed?.status).toBe("placed");
	expect(placed?.unitCents).toBe(3200);
	expect(placed?.totalCents).toBe(3200);
	expect(placed?.side).toBe("retail");
	const adaEarly = await store.findAccountByEmail(db, "ada@example.com");
	const reordered = await handlePost(
		post(
			`/account/orders/${placedId}`,
			{ csrf: csrfOf(retailCookie), action: "reorder" },
			retailCookie,
			"203.0.113.16",
		),
	);
	expect(reordered.headers.get("location")).toBe("/cart");
	expect(await store.readCartQty(db, adaEarly?.id ?? "")).toBe(1);

	const second = await handlePost(
		post(
			"/cart",
			{ csrf: csrfOf(retailCookie), qty: "1" },
			retailCookie,
			"203.0.113.18",
		),
	);
	expect(second.status).toBe(303);
	const secondDone = await handlePost(
		post(
			"/checkout",
			{
				csrf: csrfOf(retailCookie),
				contactName: "Ada",
				...address,
				line1: "400 Cancel Lane",
			},
			retailCookie,
			"203.0.113.19",
		),
	);
	const secondId =
		new URL(
			secondDone.headers.get("location") ?? "",
			"http://127.0.0.1:3190",
		).searchParams.get("order") ?? "";
	const edited = await handlePost(
		post(
			`/account/orders/${placedId}`,
			{
				csrf: csrfOf(retailCookie),
				action: "save",
				contactName: "Ada",
				...address,
				line1: "88 Ship Street",
			},
			retailCookie,
			"203.0.113.20",
		),
	);
	expect(edited.headers.get("location")).toContain("saved=1");
	expect((await store.getOrder(db, placedId))?.shipLine1).toBe(
		"88 Ship Street",
	);
	const cancelled = await handlePost(
		post(
			`/account/orders/${secondId}`,
			{ csrf: csrfOf(retailCookie), action: "cancel" },
			retailCookie,
			"203.0.113.21",
		),
	);
	expect(cancelled.headers.get("location")).toContain("cancelled=1");
	expect((await store.getOrder(db, secondId))?.status).toBe("cancelled");

	const otherIssued = await issueCsrf();
	const otherReg = await handlePost(
		post(
			"/register",
			{
				csrf: otherIssued.token,
				email: "bao@example.com",
				password: otherPassword,
				name: "Bao",
				phone: "",
			},
			otherIssued.cookie,
			"203.0.113.22",
		),
	);
	const otherCookie = jar(otherReg, otherIssued.cookie);
	const stolen = await handlePost(
		post(
			`/account/orders/${placedId}`,
			{ csrf: csrfOf(otherCookie), action: "cancel" },
			otherCookie,
			"203.0.113.23",
		),
	);
	expect(stolen.status).toBe(403);
	expect((await store.getOrder(db, placedId))?.status).toBe("placed");
	const otherRead = await pages.orderPage(
		readSessionToken(otherCookie) ?? "",
		placedId,
	);
	expect(otherRead.kind).toBe("forbidden");

	const customerStaff = await handlePost(
		post(
			"/staff/blasts",
			{
				csrf: csrfOf(retailCookie),
				audience: "preorder",
				subject: "No",
				body: "No",
			},
			retailCookie,
			"203.0.113.24",
		),
	);
	expect(customerStaff.status).toBe(403);
	expect(
		(await pages.staffHome(readSessionToken(retailCookie) ?? ""))
			.kind,
	).toBe("forbidden");
	const exportDenied = await handleExport(
		new Request("http://127.0.0.1:3190/api/staff/orders.csv", {
			headers: { cookie: retailCookie },
		}),
	);
	expect(exportDenied.status).toBe(403);
	expect(
		(await pages.staffProduct(readSessionToken(retailCookie) ?? ""))
			.kind,
	).toBe("forbidden");

	const staffIssued = await issueCsrf();
	const staffLogin = await handlePost(
		post(
			"/staff/login",
			{
				csrf: staffIssued.token,
				email: "staff@hmongtea.com",
				password: staffPassword,
			},
			staffIssued.cookie,
			"203.0.113.25",
		),
	);
	expect(staffLogin.headers.get("location")).toBe("/staff");
	const staffCookie = jar(staffLogin, staffIssued.cookie);
	const retailDoor = await handlePost(
		post(
			"/login",
			{
				csrf: csrfOf(staffCookie),
				email: "staff@hmongtea.com",
				password: staffPassword,
			},
			staffCookie,
			"203.0.113.26",
		),
	);
	expect(retailDoor.headers.get("location")).toBe("/staff");
	expect((await pages.staffHome("")).kind).toBe("anonymous");
	expect((await pages.wholesaleDesk("")).kind).toBe("anonymous");
	expect((await pages.accountPage("")).kind).toBe("anonymous");
	expect(
		(await pages.staffHome(readSessionToken(wholesaleCookie) ?? ""))
			.kind,
	).toBe("forbidden");
	expect(
		(await pages.accountPage(readSessionToken(wholesaleCookie) ?? ""))
			.kind,
	).toBe("forbidden");
	const partnerStaff = await handlePost(
		post(
			"/staff/products",
			{ csrf: csrfOf(wholesaleCookie), onHand: "1" },
			wholesaleCookie,
			"203.0.113.26",
		),
	);
	expect(partnerStaff.status).toBe(403);
	const loggedOutPortal = await handlePost(
		post("/staff/products", { onHand: "1" }, "", "203.0.113.26"),
	);
	expect(loggedOutPortal.status).toBe(303);
	expect(loggedOutPortal.headers.get("location")).toBe("/login");

	const shipped = await handlePost(
		post(
			`/staff/orders/${placedId}`,
			{
				csrf: csrfOf(staffCookie),
				action: "ship",
				shipDate: "2026-11-17",
				tracking: "TRACK-D7-1001",
			},
			staffCookie,
			"203.0.113.27",
		),
	);
	expect(shipped.headers.get("location")).toContain("shipped=1");
	const shippedRow = await store.getOrder(db, placedId);
	expect(shippedRow?.status).toBe("shipped");
	expect(shippedRow?.trackingNumber).toBe("TRACK-D7-1001");
	expect(shippedRow?.shipDate).toBe("2026-11-17");
	const seen = await pages.orderPage(
		readSessionToken(retailCookie) ?? "",
		placedId,
	);
	expect(seen.kind).toBe("ok");
	if (seen.kind === "ok")
		expect(seen.order.trackingNumber).toBe("TRACK-D7-1001");
	await expect(
		sql.unsafe(
			`update orders set status = 'shipped', ship_date = null, tracking_number = null where id = '${secondId}'`,
		),
	).rejects.toThrow();

	const renamed = await handlePost(
		post(
			`/staff/orders/${placedId}`,
			{
				csrf: csrfOf(staffCookie),
				action: "save",
				contactName: "Ada, Lee",
				qty: "2",
				...address,
				line1: "88 Ship Street",
			},
			staffCookie,
			"203.0.113.28",
		),
	);
	expect(renamed.headers.get("location")).toContain("error=shipped");

	const found = await store.searchOrders(db, {
		q: "ada@example.com",
		side: "retail",
		status: "shipped",
	});
	expect(found.some((row) => row.id === placedId)).toBe(true);
	const byId = await store.searchOrders(db, { q: placedId });
	expect(byId.some((row) => row.id === placedId)).toBe(true);
	const wrongSide = await store.searchOrders(db, {
		q: "ada@example.com",
		side: "wholesale",
	});
	expect(wrongSide.some((row) => row.id === placedId)).toBe(false);

	const removed = await handlePost(
		post(
			`/staff/orders/${secondId}`,
			{ csrf: csrfOf(staffCookie), action: "delete" },
			staffCookie,
			"203.0.113.29",
		),
	);
	expect(removed.headers.get("location")).toContain("deleted=1");
	expect(await store.getOrder(db, secondId)).toBeNull();

	const signup = await handlePost(
		post(
			"/updates",
			{ csrf: csrfOf(retailCookie), email: "news@example.com", name: "News" },
			retailCookie,
			"203.0.113.40",
		),
	);
	expect(signup.headers.get("location")).toContain("joined=1");
	const pendingMail = await sql<
		{ body: string }[]
	>`select body from mail_log where to_email = 'news@example.com'`;
	const confirm = mailToken(pendingMail[0]?.body ?? "", "/updates/confirm");
	expect(await store.confirmSignup(db, confirm)).toBe("confirmed");
	expect(await store.confirmSignup(db, confirm)).toBe("confirmed");
	const pendingOnly = await handlePost(
		post(
			"/updates",
			{ csrf: csrfOf(retailCookie), email: "later@example.com", name: "" },
			retailCookie,
			"203.0.113.41",
		),
	);
	expect(pendingOnly.status).toBe(303);

	const preBlast = await handlePost(
		post(
			"/staff/blasts",
			{
				csrf: csrfOf(staffCookie),
				audience: "preorder",
				subject: "Pack update",
				body: "The pack is still in pre-order.",
			},
			staffCookie,
			"203.0.113.42",
		),
	);
	expect(preBlast.headers.get("location")).toContain("sent=");
	const updateBlast = await handlePost(
		post(
			"/staff/blasts",
			{
				csrf: csrfOf(staffCookie),
				audience: "updates",
				subject: "List note",
				body: "Thanks for joining the update list.",
			},
			staffCookie,
			"203.0.113.43",
		),
	);
	expect(updateBlast.headers.get("location")).toContain("sent=1");
	const recipients = await sql<{ email: string; audience: string }[]>`
		select r.email, b.audience from blast_recipients r join blasts b on b.id = r.blast_id
	`;
	expect(
		recipients.some(
			(row) => row.audience === "updates" && row.email === "news@example.com",
		),
	).toBe(true);
	expect(
		recipients.some(
			(row) => row.audience === "updates" && row.email === "later@example.com",
		),
	).toBe(false);
	expect(
		recipients.some(
			(row) => row.audience === "preorder" && row.email === "ada@example.com",
		),
	).toBe(true);
	expect(
		recipients.some(
			(row) => row.audience === "preorder" && row.email === "shop@example.com",
		),
	).toBe(false);
	const listMail = await sql<
		{ body: string }[]
	>`select body from mail_log where subject = 'List note'`;
	const unsub = mailToken(listMail[0]?.body ?? "", "/unsubscribe");
	expect(await store.unsubscribeToken(db, unsub)).toBe("done");
	const afterUnsub = await handlePost(
		post(
			"/staff/blasts",
			{
				csrf: csrfOf(staffCookie),
				audience: "updates",
				subject: "After unsubscribe",
				body: "This should not arrive.",
			},
			staffCookie,
			"203.0.113.44",
		),
	);
	expect(afterUnsub.headers.get("location")).toContain("sent=0");
	const optOut = await handlePost(
		post(
			"/updates",
			{ csrf: csrfOf(retailCookie), email: "news@example.com", name: "News" },
			retailCookie,
			"203.0.113.45",
		),
	);
	expect(optOut.headers.get("location")).toContain("error=unsubscribed");

	const signupRows = await store.listSignups(db, { status: "confirmed" });
	expect(signupRows.some((row) => row.email === "later@example.com")).toBe(
		false,
	);
	const later = await store.listSignups(db, { q: "later@example.com" });
	expect(later[0]?.status).toBe("pending");
	const renamedSignup = await handlePost(
		post(
			"/staff/signups",
			{
				csrf: csrfOf(staffCookie),
				action: "save",
				id: later[0]?.id ?? "",
				name: "Later Person",
				status: "pending",
			},
			staffCookie,
			"203.0.113.46",
		),
	);
	expect(renamedSignup.headers.get("location")).toContain("saved=1");
	const deletedSignup = await handlePost(
		post(
			"/staff/signups",
			{ csrf: csrfOf(staffCookie), action: "delete", id: later[0]?.id ?? "" },
			staffCookie,
			"203.0.113.47",
		),
	);
	expect(deletedSignup.headers.get("location")).toContain("deleted=1");
	expect((await store.listSignups(db, { q: "later@example.com" })).length).toBe(
		0,
	);

	const detail = await pages.staffWholesaleDetail(
		readSessionToken(staffCookie) ?? "",
		staffRow ? "" : "",
	);
	const shop = await store.findAccountByEmail(db, "shop@example.com");
	const full = await pages.staffWholesaleDetail(
		readSessionToken(staffCookie) ?? "",
		shop?.id ?? "",
	);
	expect(full.kind).toBe("ok");
	if (full.kind === "ok") expect(full.account.taxId).toBe("12-3456789");
	expect(detail.kind === "ok" || detail.kind === "forbidden").toBe(true);
	const approved = await handlePost(
		post(
			`/staff/wholesale/${shop?.id}`,
			{ csrf: csrfOf(staffCookie), action: "approve" },
			staffCookie,
			"203.0.113.48",
		),
	);
	expect(approved.headers.get("location")).toContain("saved=1");
	const terms = await handlePost(
		post(
			`/staff/wholesale/${shop?.id}`,
			{ csrf: csrfOf(staffCookie), action: "terms", netTerms: "1" },
			staffCookie,
			"203.0.113.49",
		),
	);
	expect(terms.headers.get("location")).toContain("saved=1");
	const wholesaleOrder = await handlePost(
		post(
			"/wholesale/order",
			{
				csrf: csrfOf(wholesaleCookie),
				qty: "12",
				contactName: "Mina",
				...address,
			},
			wholesaleCookie,
			"203.0.113.50",
		),
	);
	expect(wholesaleOrder.status).toBe(303);
	const wholesaleId =
		wholesaleOrder.headers.get("location")?.split("/").pop() ?? "";
	const wholesaleRow = await store.getOrder(db, wholesaleId);
	expect(wholesaleRow?.side).toBe("wholesale");
	expect(wholesaleRow?.qty).toBe(12);
	expect(wholesaleRow?.unitCents).toBe(2400);
	expect(wholesaleRow?.totalCents).toBe(28800);
	expect(wholesaleRow?.paymentMode).toBe("net-terms-placeholder");
	expect(wholesaleRow?.netTerms).toBe(true);
	const repriced = await handlePost(
		post(
			`/staff/orders/${wholesaleId}`,
			{
				csrf: csrfOf(staffCookie),
				action: "save",
				contactName: "Mina, Owner",
				qty: "24",
				...address,
			},
			staffCookie,
			"203.0.113.55",
		),
	);
	expect(repriced.headers.get("location")).toContain("saved=1");
	const repricedRow = await store.getOrder(db, wholesaleId);
	expect(repricedRow?.qty).toBe(24);
	expect(repricedRow?.unitCents).toBe(2200);
	expect(repricedRow?.totalCents).toBe(52800);
	expect(repricedRow?.contactName).toBe("Mina, Owner");
	const low = await handlePost(
		post(
			"/wholesale/order",
			{
				csrf: csrfOf(wholesaleCookie),
				qty: "5",
				contactName: "Mina",
				...address,
			},
			wholesaleCookie,
			"203.0.113.51",
		),
	);
	expect(low.headers.get("location")).toContain("error=moq");

	const csv = await handleExport(
		new Request("http://127.0.0.1:3190/api/staff/orders.csv", {
			headers: { cookie: staffCookie },
		}),
	);
	expect(csv.status).toBe(200);
	const csvText = await csv.text();
	expect(csvText).toContain("ada@example.com");
	expect(csvText).toContain("shop@example.com");
	expect(csvText).toContain("wholesale");
	expect(csvText).toContain("retail");
	expect(csvText).toContain('"Mina, Owner"');

	const campaignSaved = await handlePost(
		post(
			"/staff/campaign",
			{ csrf: csrfOf(staffCookie), target: "25000", raised: "8000" },
			staffCookie,
			"203.0.113.52",
		),
	);
	expect(campaignSaved.headers.get("location")).toContain("saved=1");
	const campaign = await store.readCampaign(db);
	expect(campaign?.targetCents).toBe(2500000);
	expect(campaign?.raisedCents).toBe(800000);
	expect(campaign?.placeholder).toBe(true);
	const home = await pages.readHome();
	expect(home.placeholder).toBe(true);
	expect(home.raisedCents).toBe(800000);

	const missingCsrf = await handlePost(
		post("/cart", { qty: "1" }, retailCookie, "203.0.113.53"),
	);
	expect(missingCsrf.headers.get("location")).toContain("error=csrf");

	process.env.RATE_LIMIT_MAX = "3";
	let limited = 0;
	for (let i = 0; i < 4; i += 1) {
		const response = await handlePost(
			post(
				"/updates",
				{ csrf: csrfOf(retailCookie), email: "not-an-email", name: "" },
				retailCookie,
				"198.51.100.9",
			),
		);
		limited = response.status;
	}
	expect(limited).toBe(429);
	process.env.RATE_LIMIT_MAX = "30";

	const loggedOut = await handlePost(
		post(
			"/logout",
			{ csrf: csrfOf(retailCookie) },
			retailCookie,
			"203.0.113.54",
		),
	);
	expect(loggedOut.status).toBe(303);
	expect(
		await store.findViewer(db, readSessionToken(retailCookie)),
	).toBeNull();

	const ada = await store.findAccountByEmail(db, "ada@example.com");
	expect(ada).not.toBeNull();
	if (!ada) throw new Error("missing ada");
	const unpaidId = await store.insertOrder(
		db,
		{
			account: ada,
			orderSide: "retail",
			qty: 1,
			contactName: "Ada",
			phone: "5550100000",
			address: {
				line1: "12 Tea Road",
				line2: "",
				city: "Chiang Rai",
				region: "Chiang Rai",
				postalCode: "57000",
				country: "TH",
				phone: "5550100000",
			},
			payment: "stripe",
		},
		{ side: "retail", qty: 1, unitCents: 3200, totalCents: 3200 },
	);
	expect((await store.getOrder(db, unpaidId))?.status).toBe("unpaid");
	process.env.STRIPE_SECRET_KEY = "sk_test_abc";
	process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_xyz";
	process.env.STRIPE_WEBHOOK_SECRET = "not-a-secret";
	const ignored = await handleWebhook(
		new Request("http://127.0.0.1:3190/api/stripe/webhook", {
			method: "POST",
			body: "{}",
		}),
	);
	expect(ignored.status).toBe(400);
	const secret = "whsec_test_secret";
	process.env.STRIPE_WEBHOOK_SECRET = secret;
	const payload = JSON.stringify({
		id: "evt_backend",
		object: "event",
		type: "checkout.session.completed",
		data: {
			object: {
				id: "cs_backend",
				object: "checkout.session",
				payment_status: "paid",
				metadata: { orderId: unpaidId },
				client_reference_id: unpaidId,
			},
		},
	});
	const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
		payload,
		secret,
	});
	const paid = await handleWebhook(
		new Request("http://127.0.0.1:3190/api/stripe/webhook", {
			method: "POST",
			headers: { "stripe-signature": signature },
			body: payload,
		}),
	);
	expect(paid.status).toBe(200);
	expect((await store.getOrder(db, unpaidId))?.status).toBe("placed");
	process.env.STRIPE_SECRET_KEY = "";
	process.env.STRIPE_PUBLISHABLE_KEY = "";
	process.env.STRIPE_WEBHOOK_SECRET = "";

	const auditRows = await store.listAudit(db);
	expect(auditRows.some((row) => row.action === "order.ship")).toBe(true);
	expect(auditRows.some((row) => row.action === "blast.send")).toBe(true);
	expect(auditRows.some((row) => row.action === "wholesale.approve")).toBe(
		true,
	);
	expect(auditRows.some((row) => row.action === "export.csv")).toBe(true);
	expect(auditRows.some((row) => row.detail.includes(staffPassword))).toBe(
		false,
	);
	expect(auditRows.some((row) => row.detail.includes("12-3456789"))).toBe(
		false,
	);

	await store.setCart(db, ada.id, "retail", 3);
	expect(await store.readCartQty(db, ada.id)).toBe(3);
	await store.clearCart(db, ada.id);
	expect(await store.readCartQty(db, ada.id)).toBe(0);
	expect(await store.readStock(db)).toBe(4974);
	const customerList = await pages.staffCustomers(
		readSessionToken(staffCookie) ?? "",
	);
	expect(customerList.kind).toBe("ok");
	if (customerList.kind === "ok") {
		expect(
			customerList.customers.some((row) => row.email === "ada@example.com"),
		).toBe(true);
		expect(
			customerList.customers.some((row) => row.email === "shop@example.com"),
		).toBe(false);
	}

	const badOrigin = await handlePost(
		new Request("http://127.0.0.1:3190/login", {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				origin: "https://evil.example",
				cookie: staffCookie,
			},
			body: new URLSearchParams({
				csrf: csrfOf(staffCookie),
				email: "ada@example.com",
				password: retailPassword,
			}),
		}),
	);
	expect(badOrigin.status).toBe(403);

	const adaBackIssued = await issueCsrf();
	const adaBack = await handlePost(
		post(
			"/login",
			{
				csrf: adaBackIssued.token,
				email: "ada@example.com",
				password: retailPassword,
			},
			adaBackIssued.cookie,
			"203.0.113.80",
		),
	);
	expect(adaBack.headers.get("location")).toBe("/account");
	const adaCookie = jar(adaBack, adaBackIssued.cookie);
	const deskFields = {
		name: "Nia",
		email: "nia@example.com",
		phone: "5550103333",
		role: "customer",
		password: `desk-${randomUUID()}`,
	};
	for (const [cookie, ip] of [
		[adaCookie, "203.0.113.81"],
		[wholesaleCookie, "203.0.113.82"],
	] as const) {
		const createDenied = await handlePost(
			post(
				"/staff/accounts",
				{ csrf: csrfOf(cookie), ...deskFields },
				cookie,
				ip,
			),
		);
		expect(createDenied.status).toBe(403);
		const orderDenied = await handlePost(
			post(
				"/staff/orders/new",
				{
					csrf: csrfOf(cookie),
					accountId: ada.id,
					qty: "1",
					contactName: "Ada",
					...address,
				},
				cookie,
				`${ip}.1`,
			),
		);
		expect(orderDenied.status).toBe(403);
		const resetDenied = await handlePost(
			post(
				"/staff/password-reset",
				{ csrf: csrfOf(cookie), email: "ada@example.com" },
				cookie,
				`${ip}.2`,
			),
		);
		expect(resetDenied.status).toBe(403);
	}
	expect(
		(await pages.staffAccountForm(readSessionToken(adaCookie) ?? ""))
			.kind,
	).toBe("forbidden");
	expect(
		(await pages.staffOrderForm(readSessionToken(adaCookie) ?? ""))
			.kind,
	).toBe("forbidden");

	const customerPassword = `desk-${randomUUID()}`;
	const createdCustomer = await handlePost(
		post(
			"/staff/accounts",
			{
				csrf: csrfOf(staffCookie),
				name: "Nia",
				email: "nia@example.com",
				phone: "5550103333",
				role: "customer",
				password: customerPassword,
			},
			staffCookie,
			"203.0.113.83",
		),
	);
	expect(createdCustomer.headers.get("location")).toBe(
		"/staff/accounts?saved=1",
	);
	const nia = await store.findAccountByEmail(db, "nia@example.com");
	expect(nia?.side).toBe("retail");
	expect(nia?.status).toBe("active");
	expect(nia?.passwordHash.startsWith("$argon2id$")).toBe(true);
	expect(
		await import("../src/server/passwords").then((mod) =>
			mod.verifyPassword(customerPassword, nia?.passwordHash ?? ""),
		),
	).toBe(true);
	const duplicateAccount = await handlePost(
		post(
			"/staff/accounts",
			{
				csrf: csrfOf(staffCookie),
				name: "Nia",
				email: "nia@example.com",
				phone: "5550103333",
				role: "customer",
				password: customerPassword,
			},
			staffCookie,
			"203.0.113.84",
		),
	);
	expect(duplicateAccount.headers.get("location")).toContain("error=taken");
	const duplicateCount = await sql<{ n: number }[]>`
		select count(*)::int as n from accounts where email = 'nia@example.com'
	`;
	expect(Number(duplicateCount[0]?.n)).toBe(1);

	process.env.SMTP_HOST = "127.0.0.1";
	process.env.SMTP_PORT = "1025";
	await fetch("http://127.0.0.1:8025/api/v1/messages", { method: "DELETE" });
	const createdPartner = await handlePost(
		post(
			"/staff/accounts",
			{
				csrf: csrfOf(staffCookie),
				name: "Bo",
				email: "bo@example.com",
				phone: "5550104444",
				role: "partner",
				company: "Bo Tea Co",
				tier: "case",
				sendPassword: "1",
			},
			staffCookie,
			"203.0.113.85",
		),
	);
	expect(createdPartner.headers.get("location")).toBe(
		"/staff/accounts?saved=1",
	);
	const bo = await store.findAccountByEmail(db, "bo@example.com");
	expect(bo?.side).toBe("wholesale");
	expect(bo?.legalName).toBe("Bo Tea Co");
	expect(bo?.pricingTier).toBe("case");
	expect(bo?.status).toBe("active");
	const setMail = await mailpitText(
		"bo@example.com",
		"Set your hmongtea.com password",
	);
	expect(setMail.includes("/reset?token=")).toBe(true);

	if (!nia || !bo || !staffRow) throw new Error("missing desk accounts");
	const customerOrder = await handlePost(
		post(
			"/staff/orders/new",
			{
				csrf: csrfOf(staffCookie),
				accountId: nia.id,
				qty: "2",
				contactName: "Nia",
				...address,
			},
			staffCookie,
			"203.0.113.86",
		),
	);
	expect(customerOrder.status).toBe(303);
	const customerOrderId = orderIdFrom(customerOrder);
	const customerRow = await store.getOrder(db, customerOrderId);
	expect(customerRow?.accountId).toBe(nia.id);
	expect(customerRow?.unitCents).toBe(3200);
	expect(customerRow?.totalCents).toBe(6400);
	expect(customerRow?.placedByStaffId).toBe(staffRow.id);
	const niaSession = await store.openSession(db, nia.id);
	const niaPage = await pages.accountPage(niaSession.token);
	expect(niaPage.kind).toBe("ok");
	if (niaPage.kind === "ok") {
		expect(
			niaPage.orders.some(
				(order) =>
					order.id === customerOrderId &&
					order.totalCents === 6400 &&
					order.placedByStaffId === staffRow.id,
			),
		).toBe(true);
	}
	const partnerOrder = await handlePost(
		post(
			"/staff/orders/new",
			{
				csrf: csrfOf(staffCookie),
				accountId: bo.id,
				qty: "12",
				contactName: "Bo",
				...address,
			},
			staffCookie,
			"203.0.113.87",
		),
	);
	const partnerOrderId = orderIdFrom(partnerOrder);
	const partnerRow = await store.getOrder(db, partnerOrderId);
	expect(partnerRow?.unitCents).toBe(2400);
	expect(partnerRow?.totalCents).toBe(28800);
	expect(partnerRow?.placedByStaffId).toBe(staffRow.id);
	const frozen = await store.updateOrderDetails(db, partnerOrderId, {
		contactName: "Bo",
		contactPhone: address.phone,
		address,
		qty: 48,
		account: bo,
	});
	expect(frozen).toBe("ok");
	const editedRow = await store.getOrder(db, partnerOrderId);
	expect(editedRow?.qty).toBe(48);
	expect(editedRow?.unitCents).toBe(2400);
	expect(editedRow?.totalCents).toBe(115200);
	const boSession = await store.openSession(db, bo.id);
	const boPage = await pages.wholesaleDesk(boSession.token);
	expect(boPage.kind).toBe("ok");
	if (boPage.kind === "ok") {
		expect(boPage.orders.some((order) => order.id === partnerOrderId)).toBe(
			true,
		);
	}

	await fetch("http://127.0.0.1:8025/api/v1/messages", { method: "DELETE" });
	const resetSend = await handlePost(
		post(
			"/staff/password-reset",
			{
				csrf: csrfOf(staffCookie),
				email: "nia@example.com",
				back: "/staff/customers",
			},
			staffCookie,
			"203.0.113.88",
		),
	);
	expect(resetSend.headers.get("location")).toBe("/staff/customers?saved=1");
	const resetText = await mailpitText(
		"nia@example.com",
		"Reset your hmongtea.com password",
	);
	expect(resetText.includes("/reset?token=")).toBe(true);
	const resetToken = resetText.match(/token=(\S+)/)?.[1] ?? "";
	expect(resetToken.length).toBeGreaterThan(20);
	const nextPassword = `next-${randomUUID()}`;
	const resetIssued = await issueCsrf();
	const resetOk = await handlePost(
		post(
			"/reset",
			{
				csrf: resetIssued.token,
				token: resetToken,
				password: nextPassword,
			},
			resetIssued.cookie,
			"203.0.113.89",
		),
	);
	expect(resetOk.headers.get("location")).toBe("/login?saved=1");
	const resetAgain = await handlePost(
		post(
			"/reset",
			{
				csrf: resetIssued.token,
				token: resetToken,
				password: nextPassword,
			},
			resetIssued.cookie,
			"203.0.113.90",
		),
	);
	expect(resetAgain.headers.get("location")).toContain("error=token");
	const niaLogin = await handlePost(
		post(
			"/login",
			{
				csrf: csrfOf(resetIssued.cookie),
				email: "nia@example.com",
				password: nextPassword,
			},
			resetIssued.cookie,
			"203.0.113.91",
		),
	);
	expect(niaLogin.headers.get("location")).toBe("/account");

	await fetch("http://127.0.0.1:8025/api/v1/messages", { method: "DELETE" });
	const expiring = await handlePost(
		post(
			"/staff/password-reset",
			{
				csrf: csrfOf(staffCookie),
				email: "nia@example.com",
				back: "/staff/customers",
			},
			staffCookie,
			"203.0.113.92",
		),
	);
	expect(expiring.headers.get("location")).toBe("/staff/customers?saved=1");
	const expiringText = await mailpitText(
		"nia@example.com",
		"Reset your hmongtea.com password",
	);
	const expiringToken = expiringText.match(/token=(\S+)/)?.[1] ?? "";
	expect(expiringToken.length).toBeGreaterThan(20);
	const { sha256 } = await import("../src/domain/secret");
	await sql`
		update password_resets
		set expires_at = now() - interval '1 minute'
		where token_hash = ${sha256(expiringToken)}
	`;
	const expiredIssued = await issueCsrf();
	const expired = await handlePost(
		post(
			"/reset",
			{
				csrf: expiredIssued.token,
				token: expiringToken,
				password: `later-${randomUUID()}`,
			},
			expiredIssued.cookie,
			"203.0.113.93",
		),
	);
	expect(expired.headers.get("location")).toContain("error=token");

	const forgotIssued = await issueCsrf();
	const forgotMissing = await handlePost(
		post(
			"/forgot",
			{ csrf: forgotIssued.token, email: "nobody@example.com" },
			forgotIssued.cookie,
			"203.0.113.94",
		),
	);
	const forgotKnown = await handlePost(
		post(
			"/forgot",
			{ csrf: forgotIssued.token, email: "nia@example.com" },
			forgotIssued.cookie,
			"203.0.113.95",
		),
	);
	expect(forgotMissing.status).toBe(forgotKnown.status);
	expect(forgotMissing.headers.get("location")).toBe("/forgot?reset=1");
	expect(forgotKnown.headers.get("location")).toBe("/forgot?reset=1");

	const deskAudit = await store.listAudit(db);
	expect(
		deskAudit.some(
			(row) =>
				row.action === "account.create" &&
				row.staffEmail === "staff@hmongtea.com",
		),
	).toBe(true);
	expect(deskAudit.some((row) => row.action === "order.behalf")).toBe(true);
	expect(deskAudit.some((row) => row.action === "password.reset_send")).toBe(
		true,
	);
	expect(deskAudit.some((row) => row.detail.includes(resetToken))).toBe(false);
	expect(deskAudit.some((row) => row.detail.includes(customerPassword))).toBe(
		false,
	);
	process.env.SMTP_HOST = "";
});

function orderIdFrom(response: Response): string {
	const location = response.headers.get("location") ?? "";
	const id = location.split("/").pop() ?? "";
	expect(id).toMatch(/^[0-9a-f-]{36}$/i);
	return id;
}

async function mailpitText(to: string, subject: string): Promise<string> {
	const listed = await fetch(
		`http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
	);
	const body = (await listed.json()) as {
		messages?: { ID: string; Subject: string }[];
	};
	const hit = body.messages?.find((message) => message.Subject === subject);
	expect(hit?.ID).toBeTruthy();
	const full = await fetch(`http://127.0.0.1:8025/api/v1/message/${hit?.ID}`);
	const message = (await full.json()) as { Text?: string };
	return message.Text ?? "";
}
