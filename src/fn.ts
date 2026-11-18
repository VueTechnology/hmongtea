import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie, setResponseHeaders } from "@tanstack/react-start/server";
import { CSRF_COOKIE } from "./server/cookies.ts";

function noStore() {
	setResponseHeaders({ "cache-control": "no-store", vary: "cookie" });
}

export const loadShell = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readShell } = await import("./server/read.ts");
	const shell = await readShell(getRequest());
	if (shell.setCsrf) {
		setCookie(CSRF_COOKIE, shell.csrf, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
	}
	return { csrf: shell.csrf, cartCount: shell.cartCount, viewer: shell.viewer };
});

export const loadCart = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readCart } = await import("./server/cookies.ts");
	const { quote } = await import("./domain/prices.ts");
	const qty = readCart(getRequest().headers.get("cookie"))[0]?.qty ?? 0;
	const priced = qty > 0 ? quote("retail", qty) : null;
	return { qty, unitCents: priced?.unitCents ?? 0, totalCents: priced?.totalCents ?? 0 };
});

export const loadHome = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readHome } = await import("./server/read.ts");
	return readHome();
});

export const loadTea = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readTea } = await import("./server/read.ts");
	return readTea(getRequest());
});

export const loadWholesale = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readWholesale } = await import("./server/read.ts");
	return readWholesale(getRequest());
});

export const loadCheckout = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readCheckout } = await import("./server/read.ts");
	return readCheckout(getRequest());
});

export const loadAccount = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readAccount } = await import("./server/read.ts");
	return readAccount(getRequest());
});

export const loadOrder = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => ({ id: data.id }))
	.handler(async ({ data }) => {
		noStore();
		const { readOrderPage } = await import("./server/read.ts");
		return readOrderPage(getRequest(), data.id);
	});

export const loadStaffHome = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readStaffHome } = await import("./server/read.ts");
	return readStaffHome(getRequest());
});

export const loadStaffOrders = createServerFn({ method: "GET" })
	.validator((data: { q: string; status: string; side: string }) => data)
	.handler(async ({ data }) => {
		noStore();
		const { parseSideFilter, parseStatusFilter } = await import("./domain/validate.ts");
		const { readStaffOrders } = await import("./server/read.ts");
		return readStaffOrders(getRequest(), {
			q: data.q.slice(0, 80),
			status: parseStatusFilter(data.status),
			side: parseSideFilter(data.side),
		});
	});

export const loadStaffOrder = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => ({ id: data.id }))
	.handler(async ({ data }) => {
		noStore();
		const { readStaffOrder } = await import("./server/read.ts");
		return readStaffOrder(getRequest(), data.id);
	});

export const loadSignups = createServerFn({ method: "GET" })
	.validator((data: { q: string }) => ({ q: data.q.slice(0, 80) }))
	.handler(async ({ data }) => {
		noStore();
		const { readStaffSignups } = await import("./server/read.ts");
		return readStaffSignups(getRequest(), data.q);
	});

export const loadBlasts = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readStaffBlasts } = await import("./server/read.ts");
	return readStaffBlasts(getRequest());
});

export const loadPeople = createServerFn({ method: "GET" })
	.validator((data: { q: string; side: string; status: string }) => data)
	.handler(async ({ data }) => {
		noStore();
		const { readStaffAccounts } = await import("./server/read.ts");
		return readStaffAccounts(getRequest(), data.q.slice(0, 80), data.side, data.status);
	});

export const loadAudit = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readAudit } = await import("./server/read.ts");
	return readAudit(getRequest());
});

export const loadCampaign = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readCampaignPage } = await import("./server/read.ts");
	return readCampaignPage(getRequest());
});

export const loadMail = createServerFn({ method: "GET" }).handler(async () => {
	noStore();
	const { readDevMail } = await import("./server/read.ts");
	return readDevMail();
});

export const loadConfirm = createServerFn({ method: "GET" })
	.validator((data: { token: string }) => ({ token: data.token.slice(0, 80) }))
	.handler(async ({ data }) => {
		noStore();
		const { confirmSignup } = await import("./server/signups.ts");
		return { result: await confirmSignup(data.token) };
	});

export const loadUnsubscribe = createServerFn({ method: "GET" })
	.validator((data: { token: string }) => ({ token: data.token.slice(0, 80) }))
	.handler(async ({ data }) => {
		noStore();
		const { unsubscribeToken } = await import("./server/signups.ts");
		return { result: await unsubscribeToken(data.token) };
	});

