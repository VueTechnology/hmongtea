import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { formatUsd } from "#/domain/money";
import {
	cancelledText,
	deletedText,
	errors,
	savedText,
	shippedText,
} from "#/ui/copy";
import type { Notes as SearchNotes } from "#/ui/search";

const rootApi = getRouteApi("__root__");

export const fieldClass =
	"mt-1 block w-full min-h-11 rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink";
export const buttonClass =
	"inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-0 bg-button px-5 text-sm text-button-text no-underline";
export const quietButtonClass =
	"inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-muted bg-transparent px-5 text-sm text-ink no-underline";

export function useShell() {
	return rootApi.useLoaderData();
}

export function SiteFrame({ children }: { children: ReactNode }) {
	const shell = useShell();
	const path = useRouterState({ select: (state) => state.location.pathname });
	const viewer = shell.viewer;
	const wholesale = viewer?.role === "customer" && viewer.side === "wholesale";
	const staff = viewer?.role === "staff";
	const theme = wholesale ? "theme-wholesale" : "";
	const links = staff
		? [
				{ to: "/staff", label: "Home" },
				{ to: "/staff/orders", label: "Orders" },
				{ to: "/staff/customers", label: "Customers" },
				{ to: "/staff/accounts", label: "New account" },
				{ to: "/staff/orders/new", label: "Order for" },
				{ to: "/staff/wholesale", label: "Partners" },
				{ to: "/staff/products", label: "Products" },
				{ to: "/staff/signups", label: "Sign-ups" },
				{ to: "/staff/blasts", label: "Mail" },
				{ to: "/staff/audit", label: "Audit" },
			]
		: wholesale
			? [
					{ to: "/", label: "Shop" },
					{ to: "/tea", label: "Tea" },
					{ to: "/wholesale/desk", label: "Orders" },
					{ to: "/wholesale/order", label: "New order" },
					{ to: "/partners", label: "Partners" },
				]
			: [
					{ to: "/", label: "Shop" },
					{ to: "/tea", label: "Tea" },
					{ to: "/partners", label: "Partners" },
					...(viewer
						? [{ to: "/account", label: "Account" }]
						: [{ to: "/login", label: "Log in" }]),
				];
	const nav = () => (
		<>
			{links.map((link) => (
				<Link
					key={link.to}
					to={link.to}
					aria-current={path === link.to ? "page" : undefined}
					className={`text-sm no-underline ${path === link.to ? "text-ink underline decoration-leaf decoration-2 underline-offset-4" : "text-muted"}`}
				>
					{link.label}
				</Link>
			))}
			{!staff && !wholesale ? (
				<Link
					to="/cart"
					aria-label={shell.cartQty > 0 ? `Cart, ${shell.cartQty}` : "Cart"}
					className={quietButtonClass}
				>
					Cart{shell.cartQty > 0 ? ` ${shell.cartQty}` : ""}
				</Link>
			) : null}
			{viewer ? (
				<form method="post" action="/logout">
					<Csrf />
					<button className={quietButtonClass} type="submit">
						Log out
					</button>
				</form>
			) : null}
		</>
	);
	return (
		<div className={`min-h-screen bg-ivory text-ink ${theme}`}>
			<a className="skip" href="#main">
				Skip to content
			</a>
			<header className="topbar">
				<div className="brand-row">
					<Link to="/" className="wordmark">
						<img
							className="mark"
							src="/favicon.svg"
							alt="hmongtea.com"
							width={28}
							height={28}
						/>
						hmongtea.com
					</Link>
					{wholesale ? (
						<span data-testid="channel-label" className="channel-label">
							Partner
						</span>
					) : null}
					{staff ? <span className="channel-label">Staff</span> : null}
				</div>
				<nav className="desk" aria-label="Site">
					{nav()}
				</nav>
				<details className="phone">
					<summary className="menu-button">Menu</summary>
					<nav aria-label="Mobile">{nav()}</nav>
				</details>
			</header>
			{children}
			<footer>
				<div className="wrap footer-row">
					<img
						className="footer-logo"
						src="/brand/logo-nthn.jpg"
						alt="Niam Txoj Hmoo"
					/>
					<div className="stack">
						<p className="row m-0">
							{shell.demoMail ? <Link to="/dev/mail">Mail log</Link> : null}
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

export function Page({ children }: { children: ReactNode }) {
	return (
		<main id="main" className="mx-auto max-w-5xl px-4 py-10">
			{children}
		</main>
	);
}

export function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="m-0 text-xs tracking-[0.18em] text-muted uppercase">
			{children}
		</p>
	);
}

export function Title({ eyebrow, title }: { eyebrow: string; title: string }) {
	return (
		<>
			<Eyebrow>{eyebrow}</Eyebrow>
			<h1 className="mt-3 font-serif text-4xl font-medium md:text-5xl">
				{title}
			</h1>
			<div className="goldbar" aria-hidden="true" />
		</>
	);
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<p className="border border-gold bg-paper px-4 py-3 text-sm" role="status">
			{children}
		</p>
	);
}

export function Notes({ notes }: { notes: SearchNotes }) {
	const error = notes.error ? errors[notes.error] : "";
	const success = notes.claimed
		? "The order is linked to your account."
		: notes.reset
			? "If that email is on file, a reset link is on its way."
			: notes.saved
				? savedText
				: notes.cancelled
					? cancelledText
					: notes.shipped
						? shippedText
						: notes.deleted
							? deletedText
							: notes.joined === "1"
								? "Check your email and confirm the request. With no Resend key, the message is on the dev mail page."
								: notes.joined === "already"
									? "That email is already confirmed."
									: notes.sent
										? `The blast was recorded for ${notes.sent} recipients.`
										: "";
	if (!error && !success) return null;
	return <Notice>{error || success}</Notice>;
}

export function Csrf() {
	const { csrf } = useShell();
	return <input type="hidden" name="csrf" value={csrf} />;
}

export function Field({
	label,
	name,
	type = "text",
	required = false,
	defaultValue = "",
	autoComplete,
	id,
}: {
	label: string;
	name: string;
	type?: string;
	required?: boolean;
	defaultValue?: string;
	autoComplete?: string;
	id?: string;
}) {
	const fieldId = id ?? name;
	return (
		<label className="grid text-sm" htmlFor={fieldId}>
			{label}
			<input
				id={fieldId}
				className={fieldClass}
				name={name}
				type={type}
				required={required}
				defaultValue={defaultValue}
				autoComplete={autoComplete}
			/>
		</label>
	);
}

export function AddressFields({
	line1 = "",
	line2 = "",
	city = "",
	region = "",
	postalCode = "",
	country = "US",
	phone = "",
}: {
	line1?: string;
	line2?: string;
	city?: string;
	region?: string;
	postalCode?: string;
	country?: string;
	phone?: string;
}) {
	return (
		<div className="grid gap-4">
			<Field
				label="Street"
				name="line1"
				required
				defaultValue={line1}
				autoComplete="address-line1"
			/>
			<Field
				label="Street line 2"
				name="line2"
				defaultValue={line2}
				autoComplete="address-line2"
			/>
			<Field
				label="City"
				name="city"
				required
				defaultValue={city}
				autoComplete="address-level2"
			/>
			<Field
				label="Region"
				name="region"
				required
				defaultValue={region}
				autoComplete="address-level1"
			/>
			<Field
				label="Postal code"
				name="postalCode"
				required
				defaultValue={postalCode}
				autoComplete="postal-code"
			/>
			<Field
				label="Country"
				name="country"
				required
				defaultValue={country}
				autoComplete="country"
			/>
			<Field
				label="Phone"
				name="phone"
				defaultValue={phone}
				autoComplete="tel"
			/>
		</div>
	);
}

export function KickstarterBar({
	targetCents,
	raisedCents,
}: {
	targetCents: number;
	raisedCents: number;
}) {
	const pct =
		targetCents > 0
			? Math.min(100, Math.round((raisedCents / targetCents) * 100))
			: 0;
	return (
		<section
			aria-label="Kickstarter placeholder"
			data-testid="kickstarter"
			className="mt-10 border border-line bg-paper px-4 py-3"
		>
			<p className="m-0 text-xs tracking-[0.18em] text-muted uppercase">
				Kickstarter placeholder
			</p>
			<p className="m-0 mt-2 text-sm">
				Raised {formatUsd(raisedCents)} of {formatUsd(targetCents)}.
			</p>
			<p className="m-0 text-sm text-muted">
				These figures are sample numbers stored for this page. They are not a
				live campaign.
			</p>
			<div
				className="mt-2 h-2 bg-line"
				role="progressbar"
				aria-valuenow={pct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Placeholder funding"
			>
				<div className="h-2 bg-gold" style={{ width: `${pct}%` }} />
			</div>
		</section>
	);
}

export function Money({ cents, testId }: { cents: number; testId?: string }) {
	return <span data-testid={testId}>{formatUsd(cents)}</span>;
}

const statusLabel: Record<string, string> = {
	unpaid: "Unpaid",
	placed: "Placed",
	shipped: "Shipped",
	cancelled: "Cancelled",
	pending: "Pending",
	confirmed: "Confirmed",
	unsubscribed: "Unsubscribed",
	active: "Approved",
	rejected: "Rejected",
};

export function Status({ value }: { value: string }) {
	return <span>{statusLabel[value] ?? value}</span>;
}
