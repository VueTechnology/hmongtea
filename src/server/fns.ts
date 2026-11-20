import { createServerFn } from "@tanstack/react-start";
import {
	CART_COOKIE,
	CART_COOKIE_HTTP,
	CSRF_COOKIE,
	CSRF_COOKIE_HTTP,
	SESSION_COOKIE,
	SESSION_COOKIE_HTTP,
	cookieIsSecure,
	csrfCookieName,
} from "#/server/cookies";

function firstCookie(
	getCookie: (name: string) => string | undefined,
	...names: string[]
): string {
	for (const name of names) {
		const value = getCookie(name);
		if (value) return value;
	}
	return "";
}

async function sessionCookie(): Promise<string> {
	const server = await import("@tanstack/react-start/server");
	return firstCookie(server.getCookie, SESSION_COOKIE, SESSION_COOKIE_HTTP);
}

async function markStatus(status: number): Promise<void> {
	const server = await import("@tanstack/react-start/server");
	if (
		"setResponseStatus" in server &&
		typeof server.setResponseStatus === "function"
	) {
		server.setResponseStatus(status);
	}
}

export const loadShell = createServerFn({ method: "GET" }).handler(async () => {
	const server = await import("@tanstack/react-start/server");
	const { buildShell } = await import("#/server/pages");
	const shell = await buildShell({
		session: firstCookie(
			server.getCookie,
			SESSION_COOKIE,
			SESSION_COOKIE_HTTP,
		),
		cart: firstCookie(server.getCookie, CART_COOKIE, CART_COOKIE_HTTP),
		csrf: firstCookie(server.getCookie, CSRF_COOKIE, CSRF_COOKIE_HTTP),
	});
	if (shell.issueCsrf) {
		const secure = cookieIsSecure(server.getRequest());
		server.setCookie(csrfCookieName(secure), shell.csrf, {
			httpOnly: true,
			secure,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 14,
		});
	}
	server.setResponseHeader("Cache-Control", "no-store");
	server.setResponseHeader("Vary", "cookie");
	return {
		csrf: shell.csrf,
		cartQty: shell.cartQty,
		viewer: shell.viewer,
		demoMail: shell.demoMail,
	};
});

export const loadCheckout = createServerFn({ method: "GET" }).handler(
	async () => {
		const { readPaymentGate } = await import("#/domain/payment-gate");
		const { readEnv } = await import("#/server/env");
		const env = readEnv();
		const gate = readPaymentGate({
			STRIPE_SECRET_KEY: env.stripeSecret,
			STRIPE_PUBLISHABLE_KEY: env.stripePublishable,
			STRIPE_WEBHOOK_SECRET: env.stripeWebhook,
		});
		return { payment: gate.kind };
	},
);

export const loadHome = createServerFn({ method: "GET" }).handler(async () => {
	const { readHome } = await import("#/server/pages");
	return readHome();
});

export const loadAccount = createServerFn({ method: "GET" }).handler(
	async () => {
		const { accountPage } = await import("#/server/pages");
		const page = await accountPage(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadOrder = createServerFn({ method: "GET" })
	.validator((data: unknown) => (typeof data === "string" ? data : ""))
	.handler(async ({ data }) => {
		const { orderPage } = await import("#/server/pages");
		const page = await orderPage(await sessionCookie(), data);
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadWholesaleDesk = createServerFn({ method: "GET" }).handler(
	async () => {
		const { wholesaleDesk } = await import("#/server/pages");
		const page = await wholesaleDesk(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffHome = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffHome } = await import("#/server/pages");
		const page = await staffHome(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

function textFilter(data: unknown): {
	q: string;
	side: string;
	status: string;
} {
	const source =
		typeof data === "object" && data ? (data as Record<string, unknown>) : {};
	return {
		q: typeof source.q === "string" ? source.q.slice(0, 120) : "",
		side: typeof source.side === "string" ? source.side.slice(0, 20) : "",
		status: typeof source.status === "string" ? source.status.slice(0, 20) : "",
	};
}

export const loadStaffOrders = createServerFn({ method: "GET" })
	.validator(textFilter)
	.handler(async ({ data }) => {
		const { staffOrders } = await import("#/server/pages");
		const page = await staffOrders(await sessionCookie(), data);
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadStaffOrder = createServerFn({ method: "GET" })
	.validator((data: unknown) => (typeof data === "string" ? data : ""))
	.handler(async ({ data }) => {
		const { staffOrder } = await import("#/server/pages");
		const page = await staffOrder(await sessionCookie(), data);
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadStaffSignups = createServerFn({ method: "GET" })
	.validator(textFilter)
	.handler(async ({ data }) => {
		const { staffSignups } = await import("#/server/pages");
		const page = await staffSignups(await sessionCookie(), {
			q: data.q,
			status: data.status,
		});
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadStaffWholesale = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		typeof data === "string" ? data.slice(0, 20) : "",
	)
	.handler(async ({ data }) => {
		const { staffWholesaleList } = await import("#/server/pages");
		const page = await staffWholesaleList(await sessionCookie(), data);
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadStaffWholesaleAccount = createServerFn({ method: "GET" })
	.validator((data: unknown) => (typeof data === "string" ? data : ""))
	.handler(async ({ data }) => {
		const { staffWholesaleDetail } = await import("#/server/pages");
		const page = await staffWholesaleDetail(await sessionCookie(), data);
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	});

export const loadStaffAudit = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffAudit } = await import("#/server/pages");
		const page = await staffAudit(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffAccountForm = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffAccountForm } = await import("#/server/pages");
		const page = await staffAccountForm(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffOrderForm = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffOrderForm } = await import("#/server/pages");
		const page = await staffOrderForm(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffCustomers = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffCustomers } = await import("#/server/pages");
		const page = await staffCustomers(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffProduct = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffProduct } = await import("#/server/pages");
		const page = await staffProduct(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadStaffCampaign = createServerFn({ method: "GET" }).handler(
	async () => {
		const { staffCampaign } = await import("#/server/pages");
		const page = await staffCampaign(await sessionCookie());
		if (page.kind === "forbidden") await markStatus(403);
		return page;
	},
);

export const loadDevMail = createServerFn({ method: "GET" }).handler(
	async () => {
		const { devMail } = await import("#/server/pages");
		return devMail();
	},
);

export const loadConfirm = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		typeof data === "string" ? data.slice(0, 200) : "",
	)
	.handler(async ({ data }) => {
		const { runConfirm } = await import("#/server/pages");
		return runConfirm(data);
	});

export const loadUnsubscribe = createServerFn({ method: "GET" })
	.validator((data: unknown) =>
		typeof data === "string" ? data.slice(0, 200) : "",
	)
	.handler(async ({ data }) => {
		const { runUnsubscribe } = await import("#/server/pages");
		return runUnsubscribe(data);
	});
