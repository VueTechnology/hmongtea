export type AppEnv = {
	databaseUrl: string;
	appOrigin: string;
	staffEmail: string;
	staffPassword: string;
	customerEmail: string;
	customerPassword: string;
	partnerEmail: string;
	partnerPassword: string;
	taxIdKey: string;
	resendApiKey: string;
	resendFrom: string;
	stripeSecret: string;
	stripePublishable: string;
	stripeWebhook: string;
	allowTestIp: boolean;
	rateLimitMax: number;
	smtpHost: string;
	smtpPort: number;
};

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
	const max = Number(source.RATE_LIMIT_MAX ?? "20");
	return {
		databaseUrl: source.DATABASE_URL ?? "",
		appOrigin: (source.APP_ORIGIN ?? "http://127.0.0.1:3299").replace(
			/\/$/,
			"",
		),
		staffEmail: (source.STAFF_EMAIL ?? "").trim().toLowerCase(),
		staffPassword: source.STAFF_PASSWORD ?? "",
		customerEmail: (source.CUSTOMER_EMAIL ?? "").trim().toLowerCase(),
		customerPassword: source.CUSTOMER_PASSWORD ?? "",
		partnerEmail: (source.PARTNER_EMAIL ?? "").trim().toLowerCase(),
		partnerPassword: source.PARTNER_PASSWORD ?? "",
		taxIdKey: (source.TAX_ID_KEY ?? "").trim(),
		resendApiKey: (source.RESEND_API_KEY ?? "").trim(),
		resendFrom: (source.RESEND_FROM ?? "").trim(),
		stripeSecret: source.STRIPE_SECRET_KEY ?? "",
		stripePublishable: source.STRIPE_PUBLISHABLE_KEY ?? "",
		stripeWebhook: source.STRIPE_WEBHOOK_SECRET ?? "",
		allowTestIp: source.ALLOW_TEST_IP === "1",
		rateLimitMax: Number.isInteger(max) && max >= 1 && max <= 100 ? max : 20,
		smtpHost: (source.SMTP_HOST ?? "").trim(),
		smtpPort: smtpPort(source.SMTP_PORT),
	};
}

function smtpPort(value: string | undefined): number {
	const port = Number(value ?? "1025");
	if (!Number.isInteger(port) || port < 1 || port > 65535) return 1025;
	return port;
}
