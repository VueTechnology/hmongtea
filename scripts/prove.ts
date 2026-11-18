import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const base = process.env.ORIGIN ?? "http://127.0.0.1:3160";
const out = process.env.SCREEN_DIR ?? "";
const staffEmail = process.env.STAFF_EMAIL ?? "";
const staffPassword = process.env.STAFF_PASSWORD ?? "";
if (!out || !staffEmail || staffPassword.length < 12) throw new Error("SCREEN_DIR, STAFF_EMAIL, and STAFF_PASSWORD are required.");

const stamp = Date.now().toString(36);
const updatesEmail = `notes-${stamp}@hmongtea.test`;
const retailEmail = `retail-${stamp}@hmongtea.test`;
const retailPassword = `retail-${stamp}-password`;
const wholesaleEmail = `shop-${stamp}@hmongtea.test`;
const wholesalePassword = `wholesale-${stamp}-password`;

async function shot(page: Page, name: string) {
	await page.setViewport({ width: 1440, height: 900 });
	await page.screenshot({ path: join(out, `${name}-1440.png`), fullPage: true });
	await page.setViewport({ width: 390, height: 844 });
	await page.screenshot({ path: join(out, `${name}-390.png`), fullPage: true });
}

async function open(page: Page, path: string) {
	const response = await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle0", timeout: 30000 });
	const status = response?.status() ?? 0;
	if (status >= 400) {
		const body = await page.content();
		throw new Error(`${path} returned ${status} ${body.slice(0, 240)}`);
	}
	return page.url();
}

async function fill(page: Page, selector: string, value: string) {
	await page.waitForSelector(selector);
	await page.locator(selector).fill(value);
}

async function submit(page: Page, selector: string) {
	await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }), page.click(selector)]);
}

async function address(page: Page, prefix: string) {
	await fill(page, `#${prefix}-line1`, "12 Tea Road");
	await fill(page, `#${prefix}-city`, "Chiang Rai");
	await fill(page, `#${prefix}-region`, "Chiang Rai");
	await fill(page, `#${prefix}-postal`, "57000");
	await fill(page, `#${prefix}-country`, "Thailand");
}

const browser = await puppeteer.launch({
	executablePath: "/usr/bin/google-chrome",
	headless: true,
	args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

await mkdir(out, { recursive: true });

try {
	const guestContext = await browser.createBrowserContext();
	const retailContext = await browser.createBrowserContext();
	const staffContext = await browser.createBrowserContext();
	const wholesaleContext = await browser.createBrowserContext();
	const guest = await guestContext.newPage();
	const publicPages = [
		["/", "home"],
		["/tea", "tea"],
		["/cart", "cart"],
		["/checkout", "checkout"],
		["/login", "login"],
		["/register", "register"],
		["/updates", "updates"],
		["/updates/confirm?token=invalid", "confirm-invalid"],
		["/updates/unsubscribe?token=invalid", "unsubscribe-invalid"],
		["/wholesale", "wholesale"],
		["/wholesale/register", "wholesale-register"],
		["/wholesale/order", "wholesale-order-guest"],
		["/staff/login", "staff-login"],
		["/dev/mail", "dev-mail-empty"],
		["/logout", "logout"],
		["/health", "health"],
	] as const;
	for (const [path, name] of publicPages) {
		await open(guest, path);
		await shot(guest, name);
	}
	const homeText = await guest.goto(base, { waitUntil: "networkidle0" }).then(() => guest.$eval("[data-testid=kickstarter-figures]", (node) => node.textContent ?? ""));
	if (!homeText.includes("$8,400") || !homeText.includes("$25,000")) throw new Error(`Campaign figures missing: ${homeText}`);

	await open(guest, "/updates");
	await fill(guest, "[data-testid=updates-email]", updatesEmail);
	await fill(guest, "[data-testid=updates-name]", "Notes Person");
	await submit(guest, "button[type=submit]");
	if (!guest.url().includes("sent=1")) throw new Error(`Updates form stayed on ${guest.url()}`);
	await shot(guest, "updates-sent");
	await open(guest, "/dev/mail");
	const mailText = await guest.$eval("body", (node) => node.innerText);
	const confirm = mailText.match(/http:\/\/127\.0\.0\.1:3160\/updates\/confirm\?token=[A-Za-z0-9_-]+/)?.[0];
	if (!confirm) throw new Error("Confirm link missing from dev mail.");
	await open(guest, confirm);
	await guest.waitForSelector("[data-testid=confirmed]");
	await shot(guest, "confirm");

	const retail = await retailContext.newPage();
	await open(retail, "/register");
	await fill(retail, "[data-testid=register-name]", "Retail Buyer");
	await fill(retail, "[data-testid=register-email]", retailEmail);
	await fill(retail, "#register-phone", "555-0100");
	await fill(retail, "[data-testid=register-password]", retailPassword);
	await submit(retail, "button[type=submit]");
	if (!retail.url().includes("/account")) throw new Error(`Retail register landed on ${retail.url()}`);
	await shot(retail, "account-empty");

	await open(retail, "/tea");
	await shot(retail, "tea-retail");
	const retailPrice = await retail.$eval("[data-testid=retail-price]", (node) => node.textContent ?? "");
	if (!retailPrice.includes("$32")) throw new Error(`Retail price missing: ${retailPrice}`);
	if (await retail.$("[data-testid=wholesale-prices]")) throw new Error("Retail tea page showed wholesale prices.");
	await submit(retail, "button[type=submit]");
	if (!retail.url().includes("/cart")) throw new Error(`Cart add landed on ${retail.url()}`);
	await shot(retail, "cart-filled");
	await open(retail, "/checkout");
	await address(retail, "checkout");
	await submit(retail, "button[type=submit]");
	if (!retail.url().includes("/account/orders/")) throw new Error(`Checkout landed on ${retail.url()}`);
	const firstOrder = retail.url();
	await shot(retail, "order-placed");

	await open(retail, "/tea");
	await submit(retail, "button[type=submit]");
	await open(retail, "/checkout");
	await address(retail, "checkout");
	await submit(retail, "button[type=submit]");
	const secondOrder = retail.url();
	await fill(retail, "#order-line1", "40 Market Lane");
	await fill(retail, "#order-city", "Chiang Rai");
	await fill(retail, "#order-region", "Chiang Rai");
	await fill(retail, "#order-postal", "57100");
	await fill(retail, "#order-country", "Thailand");
	await submit(retail, "form button[type=submit]");
	if (!retail.url().includes("saved=1")) throw new Error(`Address save landed on ${retail.url()}`);
	const savedLine = await retail.$eval("#order-line1", (node) => (node as HTMLInputElement).value);
	if (savedLine !== "40 Market Lane") throw new Error(`Saved address did not render: ${savedLine}`);
	await shot(retail, "order-edited");

	await open(retail, firstOrder);
	await submit(retail, "form + form button[type=submit]");
	if (!retail.url().includes("cancelled=1")) throw new Error(`Cancel landed on ${retail.url()}`);
	await shot(retail, "order-cancelled");

	const staff = await staffContext.newPage();
	await open(staff, "/staff/login");
	await fill(staff, "[data-testid=staff-email]", staffEmail);
	await fill(staff, "[data-testid=staff-password]", staffPassword);
	await submit(staff, "button[type=submit]");
	if (!staff.url().endsWith("/staff") && !staff.url().endsWith("/staff/")) throw new Error(`Staff login landed on ${staff.url()}`);
	await shot(staff, "staff-home");
	await open(staff, "/staff/orders");
	await shot(staff, "staff-orders");
	const orderId = new URL(secondOrder).pathname.split("/").filter(Boolean).pop() ?? "";
	const orderPath = `/staff/orders/${orderId}`;
	await open(staff, orderPath);
	await fill(staff, "[data-testid=ship-date]", "2026-11-17");
	await fill(staff, "[data-testid=tracking]", "TH123456789");
	await submit(staff, "form:has([data-testid=ship-date]) button[type=submit]");
	if (!staff.url().includes("shipped=1")) throw new Error(`Ship landed on ${staff.url()}`);
	await staff.waitForSelector("[data-testid=staff-tracking]");
	await shot(staff, "staff-order-shipped");

	await open(retail, `/account/orders/${orderId}`);
	await retail.waitForSelector("[data-testid=order-tracking]");
	const tracking = await retail.$eval("[data-testid=order-tracking]", (node) => node.textContent ?? "");
	if (!tracking.includes("TH123456789")) throw new Error(`Tracking missing: ${tracking}`);
	await shot(retail, "order-tracking");

	await open(staff, "/staff/blasts");
	await shot(staff, "staff-blasts");
	await fill(staff, "[data-testid=blast-subject]", "Pre-order note");
	await fill(staff, "[data-testid=blast-body]", "Your hmongtea.com pre-order is on the account page.");
	await submit(staff, "form:has([data-testid=blast-subject]) button[type=submit]");
	if (!staff.url().includes("sent=1")) throw new Error(`Pre-order blast landed on ${staff.url()}`);
	await open(staff, "/staff/blasts");
	await staff.select("[data-testid=blast-audience]", "updates");
	await fill(staff, "[data-testid=blast-subject]", "Update note");
	await fill(staff, "[data-testid=blast-body]", "A note for confirmed hmongtea.com update sign-ups.");
	await submit(staff, "form:has([data-testid=blast-subject]) button[type=submit]");
	await open(guest, "/dev/mail");
	const blastText = await guest.$eval("body", (node) => node.innerText);
	if (!blastText.includes("Pre-order note") || !blastText.includes("Update note")) throw new Error("Dev mail is missing a blast.");
	await shot(guest, "dev-mail");

	await open(staff, "/staff/signups");
	await shot(staff, "staff-signups");
	await open(staff, "/staff/accounts");
	await shot(staff, "staff-accounts");
	await open(staff, "/staff/audit");
	await shot(staff, "staff-audit");
	await open(staff, "/staff/campaign");
	await shot(staff, "staff-campaign");
	await open(staff, "/staff/export");
	await shot(staff, "staff-export");
	const csv = await staff.evaluate(async () => {
		const response = await fetch("/staff/export/download");
		return { status: response.status, type: response.headers.get("content-type") ?? "", text: await response.text() };
	});
	if (csv.status !== 200 || !csv.type.includes("text/csv") || !csv.text.includes("HMT-")) throw new Error(`CSV export failed ${csv.status} ${csv.text.slice(0, 120)}`);

	const wholesale = await wholesaleContext.newPage();
	await open(wholesale, "/wholesale/register");
	await fill(wholesale, "[data-testid=legal-name]", "Tea Shop LLC");
	await fill(wholesale, "[data-testid=dba]", "Tea Shop");
	await address(wholesale, "ws");
	await fill(wholesale, "[data-testid=ws-phone]", "555-0111");
	await fill(wholesale, "[data-testid=contact-person]", "Shop Contact");
	await fill(wholesale, "[data-testid=tax-id]", "12-3456789");
	await fill(wholesale, "[data-testid=ws-email]", wholesaleEmail);
	await fill(wholesale, "[data-testid=ws-password]", wholesalePassword);
	await submit(wholesale, "button[type=submit]");
	if (!wholesale.url().includes("/account")) throw new Error(`Wholesale register landed on ${wholesale.url()}`);
	await wholesale.waitForSelector("[data-testid=tax-masked]");
	const masked = await wholesale.$eval("[data-testid=tax-masked]", (node) => node.textContent ?? "");
	if (!masked.includes("6789") || masked.includes("12-3456789")) throw new Error(`Tax ID was not masked: ${masked}`);
	await shot(wholesale, "wholesale-account-pending");
	await open(wholesale, "/wholesale/order");
	await wholesale.waitForSelector("[data-testid=pending-blocked]");
	await shot(wholesale, "wholesale-pending");
	if (await wholesale.$("[data-testid=order-tiers]")) throw new Error("Pending wholesale account saw order tiers.");

	await open(staff, "/staff/accounts");
	const approved = await staff.evaluate((email) => {
		const row = [...document.querySelectorAll("[data-testid=account-row]")].find((node) => node.textContent?.includes(email));
		const button = [...(row?.querySelectorAll("button") ?? [])].find((node) => node.textContent?.trim() === "Approve");
		if (!button) return false;
		button.click();
		return true;
	}, wholesaleEmail);
	if (!approved) throw new Error("Approve button missing.");
	await staff.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 });
	const staffTax = await staff.$eval("body", (node) => node.innerText);
	if (!staffTax.includes("12-3456789")) throw new Error("Staff did not see the tax ID.");
	await shot(staff, "staff-accounts-approved");

	await open(wholesale, "/wholesale/order");
	await wholesale.waitForSelector("[data-testid=order-tiers]");
	const tiers = await wholesale.$eval("[data-testid=order-tiers]", (node) => node.textContent ?? "");
	if (!tiers.includes("$24.00")) throw new Error(`Wholesale tier price missing: ${tiers}`);
	await shot(wholesale, "wholesale-order");
	if (!(await wholesale.$("[data-testid=wholesale-accent]"))) throw new Error("Wholesale accent missing.");
	await fill(wholesale, "#ws-order-name", "Shop Contact");
	await fill(wholesale, "#ws-order-phone", "555-0111");
	await address(wholesale, "ws-order");
	await submit(wholesale, "button[type=submit]");
	const orderText = await wholesale.$eval("[data-testid=order-status]", (node) => node.textContent ?? "");
	if (!orderText.includes("$288.00") || !orderText.includes("12 to 23 packs")) throw new Error(`Wholesale total wrong: ${orderText}`);
	await shot(wholesale, "wholesale-order-placed");

	await open(retail, "/wholesale");
	await retail.waitForSelector("[data-testid=retail-only]");
	if (await retail.$("[data-testid=wholesale-tiers]")) throw new Error("Retail account saw wholesale tiers.");
	await shot(retail, "wholesale-retail-only");
	await open(retail, "/tea");
	if (await retail.$("[data-testid=wholesale-prices]")) throw new Error("Retail tea page showed wholesale prices after wholesale activity.");
	await shot(retail, "tea-retail-after");

	console.log("prove ok");
} finally {
	await browser.close();
}
