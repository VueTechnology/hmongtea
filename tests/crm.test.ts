import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import Stripe from "stripe";
import { priceBook, quote } from "../src/domain/prices.ts";
import { normalizeEin } from "../src/domain/tax-id.ts";
import { approveWholesale, deleteAddress, deleteRejectedWholesale, login, logout, registerRetail, registerWholesale, rejectWholesale, setNetTerms, setOptOut } from "../src/server/auth.ts";
import { listRecipients, sendBlast } from "../src/server/blasts.ts";
import { readCampaign, updateCampaign } from "../src/server/campaign.ts";
import { decryptTaxId } from "../src/server/crypto.ts";
import { closeDb, getDb, getSql } from "../src/server/db.ts";
import { AppError } from "../src/server/errors.ts";
import { migrate } from "../src/server/migrate.ts";
import { cancelOwn, deleteCancelled, exportCsv, listOwn, markShipped, placeRetail, placeWholesale, readPreorder, staffEdit, staffList, updateOwnPreorder } from "../src/server/orders.ts";
import { getExport, postLogin } from "../src/server/post.ts";
import { hitLimit } from "../src/server/rate.ts";
import { readAccount, readOrderPage, readStaffAccounts, readStaffHome, readTea, readWholesale } from "../src/server/read.ts";
import { accounts, auditLog, mailLog, preorders, sessions, signups, wholesaleProfiles } from "../src/server/schema.ts";
import { confirmSignup, createSignup, deleteSignup, listSignups, unsubscribeToken, updateSignupName } from "../src/server/signups.ts";
import { applyPaidCheckout, constructStripeEvent } from "../src/server/stripe.ts";

const adminUrl = "postgres://hmongtea:local-only-db-password@127.0.0.1:3161/hmongtea";
const staffPassword = `S${crypto.randomUUID().replaceAll("-", "")}`;

process.env.DATABASE_URL = "postgres://hmongtea:local-only-db-password@127.0.0.1:3161/hmongtea_test";
process.env.ORIGIN = "http://127.0.0.1:3160";
process.env.TAX_ID_KEY = "ab".repeat(32);
process.env.STAFF_EMAIL = "staff@hmongtea.test";
process.env.STAFF_PASSWORD = staffPassword;
process.env.RESEND_API_KEY = "";
process.env.STRIPE_SECRET_KEY = "";
process.env.STRIPE_PUBLISHABLE_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";
process.env.MAIL_FROM = "hmongtea.com <updates@hmongtea.com>";
process.env.COOKIE_SECURE = "1";
process.env.TRUST_PROXY = "0";

const address = { line1: "12 Tea Road", line2: "", city: "Chiang Rai", region: "Chiang Rai", postal: "57000", country: "Thailand" };
const moved = { line1: "40 Market Lane", line2: "Unit 2", city: "Chiang Rai", region: "Chiang Rai", postal: "57100", country: "Thailand" };

async function expectDetail(run: Promise<unknown>, detail: string) {
	try {
		await run;
	} catch (error) {
		expect(error).toBeInstanceOf(AppError);
		expect((error as AppError).detail).toBe(detail);
		return;
	}
	throw new Error(`expected ${detail}`);
}

async function pgCode(run: Promise<unknown>) {
	try {
		await run;
	} catch (error) {
		const wrapped = error as { code?: string; cause?: { code?: string } };
		return wrapped.code ?? wrapped.cause?.code ?? "";
	}
	return "";
}

function sessionRequest(token: string, path = "/") {
	return new Request(`http://127.0.0.1:3160${path}`, { headers: { cookie: `__Host-hmongtea_session=${token}` } });
}

beforeAll(async () => {
	const admin = postgres(adminUrl, { max: 1 });
	await admin.unsafe("drop database if exists hmongtea_test with (force)");
	await admin.unsafe("drop database if exists hmongtea_migrate with (force)");
	await admin.unsafe("create database hmongtea_test");
	await admin.unsafe("create database hmongtea_migrate");
	await admin.end();
	const empty = postgres("postgres://hmongtea:local-only-db-password@127.0.0.1:3161/hmongtea_migrate", { max: 1 });
	await migrate(empty);
	await migrate(empty);
	const versions = await empty<{ version: string }[]>`select version from schema_migrations order by version`;
	const campaign = await empty<{ label: string; target_cents: number; raised_cents: number }[]>`select label, target_cents, raised_cents from campaign`;
	const tables = await empty<{ n: number }[]>`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`;
	await empty.end();
	expect(versions.map((row) => row.version)).toEqual(["0001_init"]);
	expect(campaign).toEqual([{ label: "placeholder", target_cents: 2_500_000, raised_cents: 840_000 }]);
	expect(tables[0]?.n).toBeGreaterThan(10);
	const { boot } = await import("../src/server/db.ts");
	await boot();
});

afterAll(async () => {
	await closeDb();
});

test("retail, wholesale, blasts, and staff checks", async () => {
	const staff = (await getDb().select().from(accounts).where(eq(accounts.email, "staff@hmongtea.test")))[0];
	expect(staff?.role).toBe("staff");
	expect(staff?.accountType).toBeNull();

	await expectDetail(registerRetail({ email: "not-an-email", password: "long-enough", name: "A", phone: "" }, "10.0.0.1"), "email");
	await expectDetail(registerRetail({ email: "short@hmongtea.test", password: "short", name: "A", phone: "" }, "10.0.0.2"), "password");
	await registerRetail({ email: "Retail.Buyer@hmongtea.test", password: "retail-password", name: "Retail Buyer", phone: "555-0100" }, "10.0.0.3");
	await expectDetail(
		registerRetail({ email: "retail.buyer@hmongtea.test", password: "retail-password", name: "Retail Buyer", phone: "" }, "10.0.0.4"),
		"conflict",
	);

	const retailLogin = await login("retail.buyer@hmongtea.test", "retail-password", "10.0.0.5");
	expect(retailLogin.account.accountType).toBe("retail");
	expect(retailLogin.account.status).toBe("active");
	const retail = retailLogin.account;

	expect(quote("retail", 12)?.unitCents).toBe(3200);
	expect(quote("wholesale", 11)).toBeNull();
	expect(priceBook({ accountType: "retail", status: "active" }).tiers).toBeNull();
	expect(priceBook({ accountType: "wholesale", status: "pending" }).orderable).toBe(false);

	const tea = await readTea(sessionRequest(retailLogin.token, "/tea"));
	expect(tea.side).toBe("retail");
	expect(tea.unitCents).toBe(3200);
	expect(tea.tiers).toBeNull();
	const wholesalePage = await readWholesale(sessionRequest(retailLogin.token, "/wholesale"));
	expect(wholesalePage.kind).toBe("retail");
	expect(wholesalePage.tiers).toBeNull();
	await expectDetail(placeWholesale(retail, 12, "Retail Buyer", "555-0100", address), "forbidden");

	const first = await placeRetail(retail, 1, "Retail Buyer", "555-0100", address);
	expect(first.number).toBe("HMT-1001");
	expect(first.side).toBe("retail");
	expect(first.unitCents).toBe(3200);
	expect(first.totalCents).toBe(3200);
	expect(first.paymentMode).toBe("demo");
	expect(first.status).toBe("placed");
	const second = await placeRetail(retail, 2, "Retail Buyer", "555-0100", address);
	expect(second.totalCents).toBe(6400);

	await updateOwnPreorder(retail, first.id, "Retail Buyer", "555-0199", "retail.buyer@hmongtea.test", moved);
	const edited = await readPreorder(retail, first.id);
	expect(edited.line1).toBe("40 Market Lane");
	expect(edited.contactPhone).toBe("555-0199");
	await staffEdit(staff, first.id, "Retail Buyer", "555-0188", "retail.buyer@hmongtea.test", address);
	expect((await readPreorder(staff, first.id)).line1).toBe("12 Tea Road");

	await cancelOwn(retail, second.id);
	expect((await readPreorder(retail, second.id)).status).toBe("cancelled");
	await expectDetail(cancelOwn(retail, second.id), "shipped");
	await expectDetail(deleteCancelled(staff, first.id), "forbidden");
	await deleteCancelled(staff, second.id);
	expect((await listOwn(retail)).some((row) => row.id === second.id)).toBe(false);

	await markShipped(staff, first.id, "2026-11-17", "TH123456789");
	const shipped = await readPreorder(retail, first.id);
	expect(shipped.status).toBe("shipped");
	expect(shipped.trackingNumber).toBe("TH123456789");
	expect(shipped.shipDate).toBe("2026-11-17");
	await expectDetail(updateOwnPreorder(retail, first.id, "Retail Buyer", "555-0100", "retail.buyer@hmongtea.test", address), "shipped");

	const other = await registerRetail({ email: "other.buyer@hmongtea.test", password: "other-password", name: "Other Buyer", phone: "" }, "10.0.0.6").then(() =>
		login("other.buyer@hmongtea.test", "other-password", "10.0.0.7"),
	);
	try {
		await readPreorder(other.account, first.id);
		throw new Error("expected not_found");
	} catch (error) {
		expect((error as AppError).code).toBe("not_found");
	}
	expect((await readOrderPage(sessionRequest(other.token, `/account/orders/${first.id}`), first.id)).kind).toBe("missing");
	expect((await readStaffHome(sessionRequest(retailLogin.token, "/staff"))).kind).toBe("forbidden");
	await expectDetail(staffList(retail, { q: "", status: "", side: "" }), "forbidden");
	const exportDenied = await getExport(sessionRequest(retailLogin.token, "/staff/export"));
	expect(exportDenied.status).toBe(303);
	expect(exportDenied.headers.get("location")).toBe("/staff/login");

	const listed = await staffList(staff, { q: "retail.buyer", status: "shipped", side: "retail" });
	expect(listed.map((row) => row.id)).toEqual([first.id]);
	const csv = await exportCsv(staff, { q: "", status: "", side: "retail" });
	expect(csv).toContain("HMT-1001");
	expect(csv).toContain("TH123456789");

	await expectDetail(
		registerWholesale(
			{
				email: "shop@hmongtea.test",
				password: "wholesale-password",
				legalName: "Tea Shop LLC",
				dba: "Tea Shop",
				phone: "555-0111",
				contactPerson: "Shop Contact",
				website: "",
				resellerCertificate: "",
				taxId: "000000000",
				address,
			},
			"10.1.0.1",
		),
		"tax",
	);
	expect(normalizeEin("12-3456789")).toBe("12-3456789");
	await registerWholesale(
		{
			email: "shop@hmongtea.test",
			password: "wholesale-password",
			legalName: "Tea Shop LLC",
			dba: "Tea Shop",
			phone: "555-0111",
			contactPerson: "Shop Contact",
			website: "https://shop.example",
			resellerCertificate: "RS-100",
			taxId: "123456789",
			address,
		},
		"10.1.0.2",
	);
	const pendingLogin = await login("shop@hmongtea.test", "wholesale-password", "10.1.0.3");
	expect(pendingLogin.account.status).toBe("pending");
	await expectDetail(placeWholesale(pendingLogin.account, 12, "Shop Contact", "555-0111", address), "pending");
	expect((await readWholesale(sessionRequest(pendingLogin.token, "/wholesale"))).kind).toBe("pending");
	const ownerView = await readAccount(sessionRequest(pendingLogin.token, "/account"));
	expect(ownerView.kind).toBe("ok");
	if (ownerView.kind === "ok") {
		expect(ownerView.tax?.full).toBeNull();
		expect(ownerView.tax?.masked).toBe("••-•••6789");
	}
	const [profile] = await getDb().select().from(wholesaleProfiles).where(eq(wholesaleProfiles.accountId, pendingLogin.account.id));
	expect(profile?.taxIdCipher).not.toContain("12-3456789");
	expect(decryptTaxId(profile?.taxIdCipher ?? "")).toBe("12-3456789");
	const staffPeople = await readStaffAccounts(sessionRequest((await login(process.env.STAFF_EMAIL, staffPassword, "10.2.0.1")).token, "/staff/accounts"), "shop@", "wholesale", "pending");
	expect(staffPeople.kind).toBe("ok");
	if (staffPeople.kind === "ok") {
		expect(staffPeople.people[0]?.taxFull).toBe("12-3456789");
		expect(staffPeople.people[0]?.taxMasked).toBe("••-•••6789");
	}

	await approveWholesale(staff, pendingLogin.account.id);
	const approved = (await getDb().select().from(accounts).where(eq(accounts.id, pendingLogin.account.id)))[0];
	expect(approved?.status).toBe("active");
	if (!approved) throw new Error("missing wholesale account");
	const wholesaleOrder = await placeWholesale(approved, 12, "Shop Contact", "555-0111", address);
	expect(wholesaleOrder.side).toBe("wholesale");
	expect(wholesaleOrder.unitCents).toBe(2400);
	expect(wholesaleOrder.totalCents).toBe(28800);
	expect(wholesaleOrder.tierLabel).toBe("12 to 23 packs");
	await setNetTerms(staff, approved.id, true);
	expect((await getDb().select().from(wholesaleProfiles).where(eq(wholesaleProfiles.accountId, approved.id)))[0]?.netTermsPlaceholder).toBe(true);

	await registerWholesale(
		{
			email: "closed@hmongtea.test",
			password: "wholesale-password",
			legalName: "Closed Shop LLC",
			dba: "Closed Shop",
			phone: "555-0122",
			contactPerson: "Closed Contact",
			website: "",
			resellerCertificate: "",
			taxId: "98-7654321",
			address,
		},
		"10.1.0.4",
	);
	const closed = (await getDb().select().from(accounts).where(eq(accounts.email, "closed@hmongtea.test")))[0];
	if (!closed) throw new Error("missing closed account");
	await rejectWholesale(staff, closed.id);
	await deleteRejectedWholesale(staff, closed.id);
	expect((await getDb().select().from(accounts).where(eq(accounts.id, closed.id))).length).toBe(0);
	await expectDetail(deleteRejectedWholesale(staff, approved.id), "forbidden");

	await createSignup("Notes.Person@hmongtea.test", "Notes Person", "10.3.0.1");
	await createSignup("pending.person@hmongtea.test", "", "10.3.0.2");
	const noteMails = await getDb().select().from(mailLog).where(eq(mailLog.toEmail, "notes.person@hmongtea.test"));
	expect(noteMails[0]?.mode).toBe("demo");
	const confirmToken = noteMails[0]?.body.match(/\/updates\/confirm\?token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
	expect(await confirmSignup(confirmToken)).toBe("confirmed");
	expect(await confirmSignup(confirmToken)).toBe("invalid");
	await expectDetail(createSignup("notes.person@hmongtea.test", "Again", "10.3.0.3"), "subscribed");

	const updates = await sendBlast(staff, "updates", "A note from hmongtea.com", "The next pack is in pre-order.");
	const updateRecipients = await listRecipients(staff, updates.blastId);
	expect(updateRecipients.find((row) => row.email === "notes.person@hmongtea.test")?.status).toBe("sent");
	expect(updateRecipients.find((row) => row.email === "pending.person@hmongtea.test")?.status).toBe("skipped_pending");
	const blastMail = (await getDb().select().from(mailLog).where(eq(mailLog.toEmail, "notes.person@hmongtea.test")).orderBy(mailLog.createdAt))[1];
	const unsubscribe = blastMail?.body.match(/\/updates\/unsubscribe\?token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
	expect(await unsubscribeToken(unsubscribe)).toBe("done");
	expect((await getDb().select().from(signups).where(eq(signups.email, "notes.person@hmongtea.test")))[0]?.status).toBe("unsubscribed");
	const again = await sendBlast(staff, "updates", "Second note", "This one skips the unsubscribed address.");
	expect((await listRecipients(staff, again.blastId)).find((row) => row.email === "notes.person@hmongtea.test")?.status).toBe("skipped_unsubscribed");

	const preorderBlast = await sendBlast(staff, "preorder", "Your pre-order", "Tracking is on the account page.");
	const preorderRecipients = await listRecipients(staff, preorderBlast.blastId);
	expect(preorderRecipients.find((row) => row.email === "retail.buyer@hmongtea.test")?.status).toBe("sent");
	expect(preorderRecipients.find((row) => row.email === "shop@hmongtea.test")?.status).toBe("sent");
	await setOptOut(retail, true);
	const skipped = await sendBlast(staff, "preorder", "Another note", "Skipped after opt out.");
	expect((await listRecipients(staff, skipped.blastId)).find((row) => row.email === "retail.buyer@hmongtea.test")?.status).toBe("skipped_unsubscribed");

	const signupRows = await listSignups(staff, "pending.person");
	expect(signupRows).toHaveLength(1);
	await updateSignupName(staff, signupRows[0]?.id ?? "", "Pending Person");
	expect((await listSignups(staff, "pending.person"))[0]?.name).toBe("Pending Person");
	await deleteSignup(staff, signupRows[0]?.id ?? "");
	expect(await listSignups(staff, "pending.person")).toHaveLength(0);
	await expectDetail(listSignups(retail, ""), "forbidden");

	const before = await readCampaign();
	expect(before.label).toBe("placeholder");
	await updateCampaign(staff, 2_600_000, 900_000);
	const after = await readCampaign();
	expect(after.targetCents).toBe(2_600_000);
	expect(after.raisedCents).toBe(900_000);
	expect(after.label).toBe("placeholder");
	await expectDetail(updateCampaign(retail, 1, 1), "forbidden");

	const saved = await getDb().select().from(accounts).where(eq(accounts.id, retail.id));
	expect(saved[0]?.phone).toBe("555-0100");
	await deleteAddress(retail);
	try {
		await deleteAddress(retail);
		throw new Error("expected not_found");
	} catch (error) {
		expect((error as AppError).code).toBe("not_found");
	}

	await logout(retailLogin.token);
	expect((await getDb().select().from(sessions).where(eq(sessions.tokenHash, (await import("../src/server/crypto.ts")).sha256(retailLogin.token)))).length).toBe(0);

	const audits = await getDb().select().from(auditLog);
	const actions = new Set(audits.map((row) => row.action));
	for (const action of ["preorder.edit", "preorder.ship", "preorder.delete", "preorder.export", "account.approve", "account.reject", "account.delete", "account.net_terms", "blast.send", "signup.edit", "signup.delete", "campaign.update"]) {
		expect(actions.has(action)).toBe(true);
	}

	expect(await pgCode(getSql()`insert into campaign (id, target_cents, raised_cents, label) values (2, 100, 0, 'placeholder')`)).toBe("23514");
	expect(await pgCode(getSql()`update campaign set label = 'live' where id = 1`)).toBe("23514");
	expect(
		await pgCode(
			getSql()`insert into accounts (id, email, password_hash, role, account_type, name, status) values (${crypto.randomUUID()}, 'shape@hmongtea.test', 'x', 'staff', 'retail', 'Shape', 'active')`,
		),
	).toBe("23514");
	expect(
		await pgCode(
			getSql()`insert into preorders (id, number, account_id, side, status, contact_name, contact_email, contact_phone, line1, city, region, postal, country, qty, unit_cents, total_cents, tier_label, payment_mode, payment_status) values (${crypto.randomUUID()}, 'HMT-BAD-MONEY', ${retail.id}, 'retail', 'placed', 'Retail Buyer', 'retail.buyer@hmongtea.test', '', '12 Tea Road', 'Chiang Rai', 'Chiang Rai', '57000', 'Thailand', 1, 3200, 1, 'Retail pack', 'demo', 'demo')`,
		),
	).toBe("23514");
	expect(
		await pgCode(
			getSql()`insert into preorders (id, number, account_id, side, status, contact_name, contact_email, contact_phone, line1, city, region, postal, country, qty, unit_cents, total_cents, tier_label, payment_mode, payment_status) values (${crypto.randomUUID()}, 'HMT-BAD-SHIP', ${retail.id}, 'retail', 'shipped', 'Retail Buyer', 'retail.buyer@hmongtea.test', '', '12 Tea Road', 'Chiang Rai', 'Chiang Rai', '57000', 'Thailand', 1, 3200, 3200, 'Retail pack', 'demo', 'demo')`,
		),
	).toBe("23514");
	expect(await pgCode(getSql()`insert into signups (id, email, status) values (${crypto.randomUUID()}, 'notoken@hmongtea.test', 'pending')`)).toBe("23514");
	expect(await pgCode(getSql()`insert into accounts (id, email, password_hash, role, account_type, name, status) values (${crypto.randomUUID()}, 'Upper@hmongtea.test', 'x', 'customer', 'retail', 'Upper', 'active')`)).toBe("23514");

	const stripeId = crypto.randomUUID();
	await getDb().insert(preorders).values({
		id: stripeId,
		number: "HMT-STRIPE",
		accountId: retail.id,
		side: "retail",
		status: "placed",
		contactName: "Retail Buyer",
		contactEmail: "retail.buyer@hmongtea.test",
		contactPhone: "",
		line1: address.line1,
		line2: "",
		city: address.city,
		region: address.region,
		postal: address.postal,
		country: address.country,
		qty: 1,
		unitCents: 3200,
		totalCents: 3200,
		tierLabel: "Retail pack",
		paymentMode: "stripe_test",
		paymentStatus: "unpaid",
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await expectDetail(constructStripeEvent("{}", "sig", "not-a-webhook-secret", "sk_test_key"), "payment");
	const payload = JSON.stringify({
		id: "evt_test_paid",
		object: "event",
		type: "checkout.session.completed",
		data: { object: { id: "cs_test_paid", object: "checkout.session", payment_status: "paid", metadata: { orderId: stripeId } } },
	});
	const signature = await Stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: "whsec_test_secret" });
	const event = await constructStripeEvent(payload, signature, "whsec_test_secret", "sk_test_key");
	expect((await applyPaidCheckout(event)).applied).toBe(true);
	expect((await getDb().select().from(preorders).where(eq(preorders.id, stripeId)))[0]?.paymentStatus).toBe("paid");

	for (let i = 0; i < 8; i++) await hitLimit("login:test-bucket", 8);
	await expectDetail(hitLimit("login:test-bucket", 8), "rate");
	for (let i = 0; i < 8; i++) {
		await expectDetail(login("retail.buyer@hmongtea.test", "wrong-password", "10.9.0.1"), "credentials");
	}
	await expectDetail(login("retail.buyer@hmongtea.test", "retail-password", "10.9.0.1"), "rate");

	const form = new FormData();
	form.set("email", "retail.buyer@hmongtea.test");
	form.set("password", "retail-password");
	form.set("csrf", "a");
	const forged = await postLogin(
		new Request("http://127.0.0.1:3160/login", {
			method: "POST",
			headers: { origin: "http://evil.example", cookie: "__Host-hmongtea_csrf=a" },
			body: form,
		}),
	);
	expect(forged.headers.get("location")).toContain("error=csrf");
});
