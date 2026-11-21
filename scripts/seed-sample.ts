/**
 * Dev-only sample data for the HmongTea staff CRM.
 *
 *   bun run seed:sample
 *
 * Idempotent: running it again replaces only sample rows. It never
 * changes staff@hmongtea.com, customer@hmongtea.com, or partner@hmongtea.com.
 * Sample rows use emails like sample-*@example.com and ids prefixed with
 * c0870000-. Not wired into start, prove, or deploy scripts.
 */
import { eq } from "drizzle-orm";
import { openDatabase } from "#/db/client";
import {
	accounts,
	auditLog,
	blastRecipients,
	blasts,
	mailLog,
	orders,
	signups,
	suppressions,
} from "#/db/schema";
import { hashPassword } from "#/server/passwords";
import {
	daysAgo,
	isoDate,
	isProtectedEmail,
	isSampleEmail,
	PROTECTED_EMAILS,
	SAMPLE_BLASTS,
	SAMPLE_CUSTOMERS,
	SAMPLE_ORDERS,
	SAMPLE_PARTNERS,
	SAMPLE_SIGNUPS,
} from "./seed-sample-plan";

function samplePassword(): string {
	return `sample-not-for-login-${crypto.randomUUID()}`;
}

async function removeSample(sql: ReturnType<typeof openDatabase>["sql"]) {
	await sql`delete from blast_recipients where blast_id::text like 'c0870000-%' or email like 'sample-%@example.com'`;
	await sql`delete from blasts where id::text like 'c0870000-%'`;
	await sql`delete from mail_log where id::text like 'c0870000-%' or to_email like 'sample-%@example.com'`;
	await sql`delete from audit_log where id::text like 'c0870000-%'`;
	await sql`delete from password_resets where id::text like 'c0870000-%' or account_id::text like 'c0870000-%'`;
	await sql`delete from sessions where account_id::text like 'c0870000-%'`;
	await sql`delete from carts where account_id::text like 'c0870000-%'`;
	await sql`delete from unsubscribe_tokens where email like 'sample-%@example.com'`;
	await sql`delete from suppressions where email like 'sample-%@example.com'`;
	await sql`delete from signups where id::text like 'c0870000-%' or email like 'sample-%@example.com'`;
	await sql`delete from orders where id::text like 'c0870000-%' or contact_email like 'sample-%@example.com' or ship_line2 = '[sample-seed]'`;
	await sql`delete from accounts where id::text like 'c0870000-%' or (email like 'sample-%@example.com' and email not in ('staff@hmongtea.com', 'customer@hmongtea.com', 'partner@hmongtea.com'))`;
}

export async function seedSample(databaseUrl: string) {
	const opened = openDatabase(databaseUrl);
	const { db, sql } = opened;
	try {
		const staff = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.email, "staff@hmongtea.com"))
			.limit(1);
		if (!staff[0])
			throw new Error("staff@hmongtea.com is missing; will not seed");
		const staffId = staff[0].id;

		const customer = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.email, "customer@hmongtea.com"))
			.limit(1);
		const partner = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.email, "partner@hmongtea.com"))
			.limit(1);
		if (!customer[0] || !partner[0]) {
			throw new Error(
				"protected customer or partner login is missing; will not seed",
			);
		}

		await removeSample(sql);

		const passwordHash = await hashPassword(samplePassword());
		const now = new Date();

		const accountRows = [...SAMPLE_CUSTOMERS, ...SAMPLE_PARTNERS].map(
			(person) => {
				if (isProtectedEmail(person.email) || !isSampleEmail(person.email)) {
					throw new Error(
						`refusing to insert protected or unmarked email ${person.email}`,
					);
				}
				return {
					id: person.id,
					email: person.email,
					passwordHash,
					role: "customer" as const,
					side: person.side,
					status: person.status,
					name: person.name,
					phone: person.phone,
					legalName: "legalName" in person ? person.legalName : "",
					dba: "dba" in person ? person.dba : "",
					businessAddress:
						"businessAddress" in person ? person.businessAddress : "",
					businessPhone: "businessPhone" in person ? person.businessPhone : "",
					contactPerson: "contactPerson" in person ? person.contactPerson : "",
					website: "website" in person ? person.website : "",
					resaleCertificate:
						"resaleCertificate" in person ? person.resaleCertificate : "",
					taxIdCipher: "",
					taxIdLast4: "taxIdLast4" in person ? person.taxIdLast4 : "",
					netTerms: "netTerms" in person ? person.netTerms : false,
					emailOptOut: "emailOptOut" in person ? person.emailOptOut : false,
					listedStore: "listedStore" in person ? person.listedStore : false,
					storeCity: "storeCity" in person ? person.storeCity : "",
					storeState: "storeState" in person ? person.storeState : "",
					storeZip: "storeZip" in person ? person.storeZip : "",
					storeDirections:
						"storeDirections" in person ? person.storeDirections : "",
					pricingTier: "pricingTier" in person ? person.pricingTier : null,
					createdAt: person.createdAt,
					updatedAt: now,
				};
			},
		);
		await db.insert(accounts).values(accountRows);

		await db.insert(orders).values(
			SAMPLE_ORDERS.map((order) => {
				let accountId = order.accountId;
				if (order.useProtected === "customer") accountId = customer[0].id;
				if (order.useProtected === "partner") accountId = partner[0].id;
				const shipped = order.status === "shipped";
				const purchasePlan: "one-time" | "subscription" =
					order.purchasePlan ?? "one-time";
				const subscriptionStatus: "active" | null =
					purchasePlan === "subscription" ? "active" : null;
				return {
					id: order.id,
					accountId,
					side: order.side,
					status: order.status,
					contactName: order.contactName,
					contactEmail: order.contactEmail,
					contactPhone: order.contactPhone,
					shipLine1: order.shipLine1,
					shipLine2: order.shipLine2,
					shipCity: order.shipCity,
					shipRegion: order.shipRegion,
					shipPostalCode: order.shipPostalCode,
					shipCountry: "US",
					qty: order.qty,
					unitCents: order.unitCents,
					totalCents: order.qty * order.unitCents,
					purchasePlan,
					subscriptionStatus,
					subscriptionIntervalWeeks:
						order.purchasePlan === "subscription"
							? (order.subscriptionIntervalWeeks ?? 4)
							: null,
					nextOrderOn:
						order.purchasePlan === "subscription"
							? (order.nextOrderOn ?? isoDate(daysAgo(-28)))
							: null,
					paymentMode: order.paymentMode,
					stripeSessionId: order.stripeSessionId ?? null,
					netTerms: order.netTerms,
					shipDate: shipped ? order.shipDate : null,
					trackingNumber: shipped ? order.trackingNumber : null,
					placedByStaffId: order.placedByStaff ? staffId : null,
					createdAt: order.createdAt,
					updatedAt: order.updatedAt,
				};
			}),
		);

		await db.insert(signups).values(
			SAMPLE_SIGNUPS.map((row) => ({
				id: row.id,
				email: row.email,
				name: row.name,
				status: row.status,
				confirmTokenHash: `sample-confirm-${row.id}`,
				createdAt: row.createdAt,
				confirmedAt: row.confirmedAt,
			})),
		);

		await db.insert(blasts).values(
			SAMPLE_BLASTS.map((row) => ({
				id: row.id,
				staffId,
				audience: row.audience,
				subject: row.subject,
				body: row.body,
				createdAt: row.createdAt,
			})),
		);
		await db.insert(blastRecipients).values(
			SAMPLE_BLASTS.flatMap((row) =>
				row.recipients.map((recipient) => ({
					id: recipient.id,
					blastId: row.id,
					email: recipient.email,
					status: recipient.status,
					createdAt: row.createdAt,
				})),
			),
		);

		let mailN = 1;
		const mailRows = [];
		for (const row of SAMPLE_BLASTS) {
			for (const recipient of row.recipients) {
				if (recipient.status !== "sent") continue;
				mailRows.push({
					id: `c0870000-a016-4000-8000-${String(mailN).padStart(12, "0")}`,
					toEmail: recipient.email,
					subject: row.subject,
					body: row.body,
					createdAt: row.createdAt,
				});
				mailN += 1;
			}
		}
		if (mailRows.length > 0) await db.insert(mailLog).values(mailRows);

		const firstShipped = SAMPLE_ORDERS.find(
			(order) => order.status === "shipped",
		);
		const firstCancelled = SAMPLE_ORDERS.find(
			(order) => order.status === "cancelled",
		);
		await db.insert(auditLog).values([
			{
				id: "c0870000-a017-4000-8000-000000000001",
				staffId,
				action: "sample.seed",
				subjectType: "sample",
				subjectId: "j0087",
				detail:
					"Loaded dev sample data for staff review. Marked sample-*@example.com / c0870000- ids.",
				createdAt: now,
			},
			{
				id: "c0870000-a017-4000-8000-000000000002",
				staffId,
				action: "partner.approve",
				subjectType: "account",
				subjectId: SAMPLE_PARTNERS[0].id,
				detail: `Approved wholesale partner ${SAMPLE_PARTNERS[0].name}`,
				createdAt: SAMPLE_PARTNERS[0].createdAt,
			},
			{
				id: "c0870000-a017-4000-8000-000000000003",
				staffId,
				action: "order.ship",
				subjectType: "order",
				subjectId: firstShipped?.id ?? "",
				detail: "Marked sample order shipped with tracking",
				createdAt: firstShipped?.updatedAt ?? now,
			},
			{
				id: "c0870000-a017-4000-8000-000000000004",
				staffId,
				action: "order.cancel",
				subjectType: "order",
				subjectId: firstCancelled?.id ?? "",
				detail: "Cancelled unpaid sample order at customer request",
				createdAt: firstCancelled?.updatedAt ?? now,
			},
		]);

		const signupSuppress = SAMPLE_SIGNUPS.filter(
			(row) => row.status === "unsubscribed",
		);
		if (signupSuppress.length > 0) {
			await db.insert(suppressions).values(
				signupSuppress.map((row) => ({
					email: row.email,
					createdAt: row.confirmedAt ?? row.createdAt,
				})),
			);
		}

		console.log(
			JSON.stringify({
				ok: true,
				customers: SAMPLE_CUSTOMERS.length,
				partners: SAMPLE_PARTNERS.length,
				orders: SAMPLE_ORDERS.length,
				signups: SAMPLE_SIGNUPS.length,
				blasts: SAMPLE_BLASTS.length,
				protectedUntouched: [...PROTECTED_EMAILS],
			}),
		);
	} finally {
		await opened.close();
	}
}

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error("DATABASE_URL is required");
		process.exit(1);
	}
	await seedSample(url);
}
