import {
	boolean,
	date,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text("role").$type<"customer" | "staff">().notNull(),
	side: text("side").$type<"retail" | "wholesale">().notNull(),
	status: text("status").$type<"active" | "pending" | "rejected">().notNull(),
	name: text("name").notNull().default(""),
	phone: text("phone").notNull().default(""),
	legalName: text("legal_name").notNull().default(""),
	dba: text("dba").notNull().default(""),
	businessAddress: text("business_address").notNull().default(""),
	businessPhone: text("business_phone").notNull().default(""),
	contactPerson: text("contact_person").notNull().default(""),
	website: text("website").notNull().default(""),
	resaleCertificate: text("resale_certificate").notNull().default(""),
	taxIdCipher: text("tax_id_cipher").notNull().default(""),
	taxIdLast4: text("tax_id_last4").notNull().default(""),
	netTerms: boolean("net_terms").notNull().default(false),
	emailOptOut: boolean("email_opt_out").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey(),
	accountId: uuid("account_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	csrfToken: text("csrf_token").notNull(),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const carts = pgTable("carts", {
	accountId: uuid("account_id").primaryKey(),
	side: text("side").$type<"retail" | "wholesale">().notNull(),
	qty: integer("qty").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const orders = pgTable("orders", {
	id: uuid("id").primaryKey(),
	accountId: uuid("account_id").notNull(),
	side: text("side").$type<"retail" | "wholesale">().notNull(),
	status: text("status")
		.$type<"unpaid" | "placed" | "shipped" | "cancelled">()
		.notNull(),
	contactName: text("contact_name").notNull(),
	contactEmail: text("contact_email").notNull(),
	contactPhone: text("contact_phone").notNull().default(""),
	shipLine1: text("ship_line1").notNull(),
	shipLine2: text("ship_line2").notNull().default(""),
	shipCity: text("ship_city").notNull(),
	shipRegion: text("ship_region").notNull(),
	shipPostalCode: text("ship_postal_code").notNull(),
	shipCountry: text("ship_country").notNull(),
	qty: integer("qty").notNull(),
	unitCents: integer("unit_cents").notNull(),
	totalCents: integer("total_cents").notNull(),
	paymentMode: text("payment_mode")
		.$type<"demo" | "stripe" | "net-terms-placeholder">()
		.notNull(),
	stripeSessionId: text("stripe_session_id"),
	netTerms: boolean("net_terms").notNull().default(false),
	shipDate: date("ship_date", { mode: "string" }),
	trackingNumber: text("tracking_number"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const signups = pgTable("signups", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull(),
	name: text("name").notNull().default(""),
	status: text("status")
		.$type<"pending" | "confirmed" | "unsubscribed">()
		.notNull(),
	confirmTokenHash: text("confirm_token_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
});

export const unsubscribeTokens = pgTable("unsubscribe_tokens", {
	tokenHash: text("token_hash").primaryKey(),
	email: text("email").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const suppressions = pgTable("suppressions", {
	email: text("email").primaryKey(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const blasts = pgTable("blasts", {
	id: uuid("id").primaryKey(),
	staffId: uuid("staff_id").notNull(),
	audience: text("audience").$type<"preorder" | "updates">().notNull(),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const blastRecipients = pgTable("blast_recipients", {
	id: uuid("id").primaryKey(),
	blastId: uuid("blast_id").notNull(),
	email: text("email").notNull(),
	status: text("status").$type<"logged" | "sent" | "failed">().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const mailLog = pgTable("mail_log", {
	id: uuid("id").primaryKey(),
	toEmail: text("to_email").notNull(),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const auditLog = pgTable("audit_log", {
	id: uuid("id").primaryKey(),
	staffId: uuid("staff_id"),
	action: text("action").notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: text("subject_id").notNull().default(""),
	detail: text("detail").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const campaign = pgTable("campaign", {
	id: integer("id").primaryKey(),
	targetCents: integer("target_cents").notNull(),
	raisedCents: integer("raised_cents").notNull(),
	placeholder: boolean("placeholder").notNull().default(true),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
});

export const products = pgTable("products", {
	sku: text("sku").primaryKey(),
	name: text("name").notNull(),
	onHand: integer("on_hand").notNull(),
});

export const rateLimits = pgTable("rate_limits", {
	bucket: text("bucket").primaryKey(),
	hits: integer("hits").notNull(),
	windowStart: timestamp("window_start", {
		withTimezone: true,
		mode: "date",
	}).notNull(),
});
