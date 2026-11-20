import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const base = process.env.APP_ORIGIN ?? "http://127.0.0.1:3190";
const outDir =
	process.env.SCREENSHOT_DIR ??
	"/home/phengvue/Desktop/Shared with Pheng/share-with-pheng/projects/hmongtea/crm/screenshots";
const staffEmail = process.env.STAFF_EMAIL ?? "";
const staffPassword = process.env.STAFF_PASSWORD ?? "";
if (!staffEmail || staffPassword.length < 12) {
	console.error("STAFF_EMAIL and STAFF_PASSWORD are required");
	process.exit(1);
}

const retailPassword = `retail-${randomUUID()}`;
const wholesalePassword = `wholesale-${randomUUID()}`;
const address = {
	line1: "12 Tea Road",
	line2: "",
	city: "Chiang Rai",
	region: "Chiang Rai",
	postalCode: "57000",
	country: "TH",
	phone: "5550100199",
};

await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
	executablePath: "/usr/bin/google-chrome",
	headless: true,
	args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(20000);

async function shot(name: string) {
	await page.waitForSelector("main");
	for (const width of [1440, 390]) {
		await page.setViewport({ width, height: width === 1440 ? 900 : 844 });
		await page.screenshot({
			path: `${outDir}/${name}-${width}.png`,
			fullPage: true,
		});
	}
	await page.setViewport({ width: 1440, height: 900 });
}

async function open(path: string) {
	const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
	if (!response) throw new Error(`no response for ${path}`);
	return response;
}

async function bodyText() {
	// biome-ignore lint/performance/useDomNodeTextContent: visible text only
	return page.evaluate(() => document.body.innerText);
}

async function mustHave(needle: string) {
	const body = await bodyText();
	if (!body.includes(needle))
		throw new Error(`missing ${JSON.stringify(needle)} at ${page.url()}`);
}

async function mustNot(needle: string) {
	const body = await bodyText();
	if (body.includes(needle))
		throw new Error(`unexpected ${JSON.stringify(needle)} at ${page.url()}`);
}

async function fill(selector: string, value: string) {
	await page.locator(selector).fill(value);
}

async function submitButton(selector: string) {
	await Promise.all([
		page.waitForNavigation({ waitUntil: "load" }),
		page.evaluate((sel) => {
			const button = document.querySelector(sel);
			if (!(button instanceof HTMLButtonElement))
				throw new Error(`missing ${sel}`);
			const form = button.closest("form");
			if (!form) throw new Error(`missing form for ${sel}`);
			form.requestSubmit(button);
		}, selector),
	]);
}

async function submitFormOf(selector: string) {
	await Promise.all([
		page.waitForNavigation({ waitUntil: "load" }),
		page.evaluate((sel) => {
			const field = document.querySelector(sel);
			const form = field?.closest("form");
			if (!(form instanceof HTMLFormElement))
				throw new Error(`missing form for ${sel}`);
			const button = form.querySelector("button[type=submit]");
			if (button instanceof HTMLButtonElement) form.requestSubmit(button);
			else form.requestSubmit();
		}, selector),
	]);
}

async function setAddress(prefix = "") {
	await fill(`${prefix}input[name=line1]`, address.line1);
	await fill(`${prefix}input[name=line2]`, address.line2);
	await fill(`${prefix}input[name=city]`, address.city);
	await fill(`${prefix}input[name=region]`, address.region);
	await fill(`${prefix}input[name=postalCode]`, address.postalCode);
	await fill(`${prefix}input[name=country]`, address.country);
	await fill(`${prefix}input[name=phone]`, address.phone);
}

async function hrefIncluding(part: string) {
	const href = await page.evaluate((needle) => {
		const link = [...document.querySelectorAll("a")].find((item) =>
			item.href.includes(needle),
		);
		return link?.href ?? "";
	}, part);
	if (!href) throw new Error(`missing link ${part} at ${page.url()}`);
	return href;
}

try {
	await open("/");
	await mustHave(
		"These figures are sample numbers stored for this page. They are not a live campaign.",
	);
	await mustHave("$6,400.00");
	await mustHave("$25,000.00");
	await shot("home");
	await open("/tea");
	await mustHave("$32.00");
	await mustNot("$24.00");
	await shot("tea");
	await open("/pre-order");
	await shot("pre-order");
	await open("/cart");
	await shot("cart-empty");
	await open("/login");
	await shot("login");
	await open("/register");
	await shot("register");
	await open("/wholesale");
	await mustHave("$24.00");
	await shot("wholesale");
	await open("/wholesale/register");
	await shot("wholesale-register");
	await open("/wholesale/login");
	await shot("wholesale-login");
	await open("/updates");
	await shot("updates");
	await open("/dev/mail");
	await shot("dev-mail-empty");
	await open("/logout");
	await shot("logout");
	await open("/staff/login");
	await shot("staff-login");
	await open("/no-such-page");
	await mustHave("That page is not here");
	await shot("not-found");

	await open("/");
	await fill("form[action='/updates'] input[name=email]", "news@example.com");
	await fill("form[action='/updates'] input[name=name]", "Nia");
	await submitButton("form[action='/updates'] button[type=submit]");
	await mustHave("Check your email");
	await shot("home-joined");
	await open("/dev/mail");
	await mustHave("Confirm updates from hmongtea.com");
	const confirm = await hrefIncluding("/updates/confirm");
	await page.goto(confirm, { waitUntil: "load" });
	await mustHave("The email is confirmed for updates.");
	await shot("updates-confirm");

	await open("/register");
	await fill("input[name=name]", "Ada");
	await fill("input[name=email]", "ada@example.com");
	await fill("input[name=phone]", "5550100100");
	await fill("input[name=password]", retailPassword);
	await submitButton("form[action='/register'] button[type=submit]");
	await mustHave("Your pre-orders");
	await shot("account-empty");

	await open("/pre-order");
	await fill("input[name=qty]", "1");
	await submitButton("form[action='/cart'] button[type=submit]");
	await mustHave("$32.00");
	await shot("cart-filled");
	await open("/checkout");
	await mustHave("Demo checkout");
	await fill("input[name=contactName]", "Ada");
	await setAddress();
	await submitButton("form[action='/checkout'] button[type=submit]");
	await mustHave("Pre-order recorded");
	await shot("checkout-done");
	const firstOrder = await hrefIncluding("/account/orders/");
	await open("/pre-order");
	await fill("input[name=qty]", "1");
	await submitButton("form[action='/cart'] button[type=submit]");
	await open("/checkout");
	await fill("input[name=contactName]", "Ada");
	await setAddress();
	await fill("input[name=line1]", "400 Cancel Lane");
	await submitButton("form[action='/checkout'] button[type=submit]");
	await page.goto(firstOrder, { waitUntil: "load" });
	await fill("input[name=line1]", "88 Ship Street");
	await submitFormOf("input[name=line1]");
	await mustHave("Saved.");
	await mustHave("88 Ship Street");
	await shot("order-edited");
	await open("/account");
	await shot("account-orders");
	const orders = await page.evaluate(() =>
		[...document.querySelectorAll("a")]
			.map((item) => item.href)
			.filter((href) => href.includes("/account/orders/")),
	);
	const second = orders.find((href) => href !== firstOrder);
	if (!second) throw new Error("missing second order");
	await page.goto(second, { waitUntil: "load" });
	await submitButton("button[value=cancel]");
	await mustHave("The order is cancelled.");
	await shot("order-cancelled");

	await open("/staff");
	await mustHave("This account cannot open that page.");
	await shot("staff-forbidden");
	await open("/wholesale/order");
	await mustHave("This account cannot open that page.");
	await mustNot("$24.00");
	await shot("wholesale-order-blocked");
	await open("/tea");
	await mustNot("$24.00");
	const retailLabel = await page.$("[data-testid=channel-label]");
	if (retailLabel) throw new Error("retail view shows the wholesale label");
	await shot("tea-retail");
	await open("/wholesale");
	await mustNot("$24.00");
	await shot("wholesale-retail-view");
	await submitButton("form[action='/logout'] button[type=submit]");

	await open("/wholesale/register");
	await fill("input[name=email]", "shop@example.com");
	await fill("input[name=password]", wholesalePassword);
	await fill("input[name=legalName]", "Tea Shop LLC");
	await fill("input[name=dba]", "Tea Shop");
	await fill("input[name=businessAddress]", "9 Market Street");
	await fill("input[name=businessPhone]", "5550102222");
	await fill("input[name=contactPerson]", "Mina");
	await fill("input[name=website]", "https://teashop.example");
	await fill("input[name=resaleCertificate]", "RC-100");
	await fill("input[name=ein]", "98-7654321");
	await submitButton("form[action='/wholesale/register'] button[type=submit]");
	await mustHave("waiting for staff approval");
	await mustHave("••-•••4321");
	const revealed = await page.$eval(
		"[data-testid=tax-id]",
		(node) => node.textContent ?? "",
	);
	if (revealed.includes("98-7654321"))
		throw new Error("wholesale desk shows the full tax id");
	await shot("wholesale-desk-pending");
	await open("/wholesale/order");
	await mustHave("waiting for staff approval");
	await shot("wholesale-order-pending");
	const channel = await page.$("[data-testid=channel-label]");
	if (!channel) throw new Error("wholesale header is missing its label");
	await submitButton("form[action='/logout'] button[type=submit]");

	await open("/staff/login");
	await fill("input[name=email]", staffEmail);
	await fill("input[name=password]", staffPassword);
	await submitButton("form[action='/staff/login'] button[type=submit]");
	await mustHave("orders");
	await shot("staff-home");
	await open("/staff/orders");
	await shot("staff-orders");
	await open("/staff/orders?side=retail&status=placed");
	const staffOrder = await hrefIncluding("/staff/orders/");
	await page.goto(staffOrder, { waitUntil: "load" });
	await mustHave("88 Ship Street");
	await shot("staff-order");
	await fill("input[name=shipDate]", "2026-11-17");
	await fill("input[name=tracking]", "TRACK-D7-1001");
	await submitButton("button[value=ship]");
	await mustHave("The order is marked shipped.");
	await mustHave("TRACK-D7-1001");
	await shot("staff-order-shipped");
	await open("/staff/signups");
	await mustHave("news@example.com");
	await shot("staff-signups");
	await open("/staff/wholesale?status=pending");
	await shot("staff-wholesale");
	const accountHref = await hrefIncluding("/staff/wholesale/");
	await page.goto(accountHref, { waitUntil: "load" });
	await mustHave("98-7654321");
	await shot("staff-wholesale-account");
	await submitButton("button[value=approve]");
	await mustHave("Saved.");
	await shot("staff-wholesale-approved");
	await open("/staff/blasts");
	await shot("staff-blasts");
	await page.select("select[name=audience]", "preorder");
	await fill("input[name=subject]", "Pre-order note");
	await fill("textarea[name=body]", "Your KuabCha pre-order is in the queue.");
	await submitButton("form[action='/staff/blasts'] button[type=submit]");
	await mustHave("The blast was recorded for");
	await page.select("select[name=audience]", "updates");
	await fill("input[name=subject]", "Update note");
	await fill("textarea[name=body]", "A short note for the update list.");
	await submitButton("form[action='/staff/blasts'] button[type=submit]");
	await shot("staff-blasts-sent");
	await open("/staff/audit");
	await mustHave("order.ship");
	await mustHave("blast.send");
	await mustHave("wholesale.approve");
	await shot("staff-audit");
	await open("/staff/campaign");
	await mustHave("Placeholder.");
	await fill("input[name=raised]", "7000");
	await submitButton("form[action='/staff/campaign'] button[type=submit]");
	await mustHave("Saved.");
	await mustHave("$7,000.00");
	await shot("staff-campaign");
	const csv = await page.evaluate(async () => {
		const response = await fetch("/api/staff/orders-csv", {
			credentials: "include",
		});
		return {
			status: response.status,
			type: response.headers.get("content-type") ?? "",
			body: await response.text(),
		};
	});
	if (csv.status !== 200 || !csv.type.includes("text/csv"))
		throw new Error(`csv export failed ${csv.status}`);
	if (!csv.body.includes("ada@example.com") || !csv.body.includes("retail"))
		throw new Error("csv is missing the retail order");
	if (csv.body.includes("98-7654321") || csv.body.toLowerCase().includes("tax"))
		throw new Error("csv includes a tax id");
	await open("/dev/mail");
	await mustHave("Pre-order note");
	await mustHave("Update note");
	await shot("dev-mail-blast");
	const unsub = await hrefIncluding("/unsubscribe");
	await page.goto(unsub, { waitUntil: "load" });
	await mustHave("This email will not receive further updates.");
	await shot("unsubscribe");
	await open("/staff/audit");
	await mustHave("export.csv");
	await submitButton("form[action='/logout'] button[type=submit]");

	await open("/");
	await mustHave("$7,000.00");
	await mustHave("These figures are sample numbers");
	await shot("home-campaign");
	await open("/login");
	await fill("input[name=email]", "ada@example.com");
	await fill("input[name=password]", retailPassword);
	await submitButton("form[action='/login'] button[type=submit]");
	await page.goto(firstOrder, { waitUntil: "load" });
	await mustHave("TRACK-D7-1001");
	await shot("order-tracking");
	await open("/tea");
	if (await page.$("[data-testid=channel-label]"))
		throw new Error("retail login still shows wholesale");
	await mustNot("$24.00");
	await submitButton("form[action='/logout'] button[type=submit]");

	await open("/wholesale/login");
	await fill("input[name=email]", "shop@example.com");
	await fill("input[name=password]", wholesalePassword);
	await submitButton("form[action='/wholesale/login'] button[type=submit]");
	await open("/wholesale/order");
	await mustHave("$24.00");
	if (!(await page.$("[data-testid=channel-label]")))
		throw new Error("approved wholesale view is missing its label");
	await shot("wholesale-order");
	await fill("input[name=qty]", "12");
	await fill("input[name=contactName]", "Mina");
	await setAddress();
	await submitButton("form[action='/wholesale/order'] button[type=submit]");
	await mustHave("$24.00");
	await mustHave("$288.00");
	const unit = await page.$eval(
		"[data-testid=unit-price]",
		(node) => node.textContent ?? "",
	);
	const total = await page.$eval(
		"[data-testid=order-total]",
		(node) => node.textContent ?? "",
	);
	if (unit !== "$24.00" || total !== "$288.00")
		throw new Error(`wholesale price ${unit} ${total}`);
	await shot("wholesale-order-placed");
	await open("/wholesale/desk");
	await shot("wholesale-desk-approved");
	console.log("prove ok");
} finally {
	await browser.close();
}
