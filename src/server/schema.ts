import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	role: text("role").notNull(),
	accountType: text("account_type"),
	name: text("name").notNull(),
	phone: text("phone").notNull(),
	status: text("status").notNull(),
	emailOptOut: boolean("email_opt_out").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const wholesaleProfiles = pgTable("wholesale_profiles", {
	accountId: uuid("account_id").primaryKey(),
	legalName: text("legal_name").notNull(),
	dba: text("dba").notNull(),
	line1: text("line1").notNull(),
	line2: text("line2").notNull(),
	city: text("city").notNull(),
	region: text("region").notNull(),
	postal: text("postal").notNull(),
	country: text("country").notNull(),
	phone: text("phone").notNull(),
	contactPerson: text("contact_person").notNull(),
	website: text("website"),
	resellerCertificate: text("reseller_certificate"),
	taxIdCipher: text("tax_id_cipher").notNull(),
	taxIdLast4: text("tax_id_last4").notNull(),
	netTermsPlaceholder: boolean("net_terms_placeholder").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const addresses = pgTable("addresses", {
	accountId: uuid("account_id").primaryKey(),
	line1: text("line1").notNull(),
	line2: text("line2").notNull(),
	city: text("city").notNull(),
	region: text("region").notNull(),
	postal: text("postal").notNull(),
	country: text("country").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey(),
	accountId: uuid("account_id").notNull(),
	tokenHash: text("token_hash").notNull().unique(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const counters = pgTable("counters", {
	name: text("name").primaryKey(),
	value: integer("value").notNull(),
});

export const preorders = pgTable("preorders", {
	id: uuid("id").primaryKey(),
	number: text("number").notNull().unique(),
	accountId: uuid("account_id").notNull(),
	side: text("side").notNull(),
	status: text("status").notNull(),
	contactName: text("contact_name").notNull(),
	contactEmail: text("contact_email").notNull(),
	contactPhone: text("contact_phone").notNull(),
	line1: text("line1").notNull(),
	line2: text("line2").notNull(),
	city: text("city").notNull(),
	region: text("region").notNull(),
	postal: text("postal").notNull(),
	country: text("country").notNull(),
	qty: integer("qty").notNull(),
	unitCents: integer("unit_cents").notNull(),
	totalCents: integer("total_cents").notNull(),
	tierLabel: text("tier_label").notNull(),
	shipDate: date("ship_date", { mode: "string" }),
	trackingNumber: text("tracking_number"),
	paymentMode: text("payment_mode").notNull(),
	paymentStatus: text("payment_status").notNull(),
	stripeSessionId: text("stripe_session_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
});

export const signups = pgTable("signups", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name"),
	status: text("status").notNull(),
	confirmTokenHash: text("confirm_token_hash"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
	unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: "date" }),
});

export const unsubscribeTokens = pgTable("unsubscribe_tokens", {
	tokenHash: text("token_hash").primaryKey(),
	email: text("email").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const blasts = pgTable("blasts", {
	id: uuid("id").primaryKey(),
	staffId: uuid("staff_id").notNull(),
	audience: text("audience").notNull(),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const blastRecipients = pgTable("blast_recipients", {
	id: uuid("id").primaryKey(),
	blastId: uuid("blast_id").notNull(),
	email: text("email").notNull(),
	status: text("status").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const mailLog = pgTable("mail_log", {
	id: uuid("id").primaryKey(),
	toEmail: text("to_email").notNull(),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	mode: text("mode").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const auditLog = pgTable("audit_log", {
	id: uuid("id").primaryKey(),
	staffId: uuid("staff_id").notNull(),
	action: text("action").notNull(),
	entity: text("entity").notNull(),
	entityId: text("entity_id").notNull(),
	detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const campaign = pgTable("campaign", {
	id: integer("id").primaryKey(),
	targetCents: integer("target_cents").notNull(),
	raisedCents: integer("raised_cents").notNull(),
	label: text("label").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const rateLimits = pgTable("rate_limits", {
	bucket: text("bucket").notNull(),
	windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
	count: integer("count").notNull(),
});
