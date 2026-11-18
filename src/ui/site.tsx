import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FORM_ERRORS } from "./errors.ts";

const root = getRouteApi("__root__");

export const fieldClass = "mt-1 block w-full min-h-11 border border-line bg-paper px-3 py-2 text-base text-ink";
export const buttonClass = "inline-flex min-h-11 cursor-pointer items-center justify-center border border-ink bg-ink px-5 text-sm text-ivory no-underline";
export const quietButtonClass = "inline-flex min-h-11 items-center justify-center border border-ink bg-paper px-5 text-sm text-ink no-underline";

type Viewer = {
	id: string;
	email: string;
	name: string;
	role: "customer" | "staff";
	accountType: "retail" | "wholesale" | null;
	status: "active" | "pending" | "rejected";
	emailOptOut: boolean;
};

const LINKS = [
	{ to: "/tea", label: "Tea" },
	{ to: "/updates", label: "Updates" },
	{ to: "/wholesale", label: "Wholesale" },
] as const;

export function SiteFrame({ children, cartCount, viewer }: { children: ReactNode; cartCount: number; viewer: Viewer | null }) {
	const path = useRouterState({ select: (state) => state.location.pathname });
	const wholesale = viewer?.accountType === "wholesale";
	return (
		<div className="min-h-screen bg-ivory text-ink">
			{wholesale ? <div className="h-1 bg-gold" data-testid="wholesale-accent" /> : null}
			<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-paper focus:px-3 focus:py-2">
				Skip to content
			</a>
			<header className="border-b border-line">
				<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
					<Link to="/" className="flex items-center gap-3 no-underline">
						<img src="/brand/mark.jpg" alt="" className="h-14 w-14 rounded-full object-cover" />
						<span className="font-serif text-2xl text-ink">hmongtea.com</span>
					</Link>
					<nav aria-label="Shop" className="flex flex-wrap items-center gap-x-4 gap-y-2">
						{wholesale ? (
							<span className="text-xs tracking-[0.18em] text-ink uppercase" data-testid="wholesale-label">
								Wholesale
							</span>
						) : null}
						{LINKS.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								aria-current={path === link.to ? "page" : undefined}
								className={`text-sm no-underline ${path === link.to ? "text-ink underline decoration-gold decoration-2 underline-offset-4" : "text-muted"}`}
							>
								{link.label}
							</Link>
						))}
						<Link to="/cart" aria-label={cartCount > 0 ? `Cart, ${cartCount}` : "Cart"} className="inline-flex min-h-11 items-center border border-ink px-4 py-2 text-sm no-underline">
							Cart{cartCount > 0 ? ` ${cartCount}` : ""}
						</Link>
						{viewer?.role === "customer" ? (
							<Link to="/account" className="text-sm text-muted no-underline">
								Account
							</Link>
						) : viewer?.role === "staff" ? (
							<Link to="/staff" className="text-sm text-muted no-underline">
								Staff
							</Link>
						) : (
							<Link to="/login" className="text-sm text-muted no-underline">
								Sign in
							</Link>
						)}
					</nav>
				</div>
			</header>
			{children}
			<footer className="border-t border-line">
				<div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-4 py-8 text-sm text-muted">
					<p className="m-0">hmongtea.com</p>
					<p className="m-0">
						<Link to="/staff/login" className="text-muted">
							Staff
						</Link>
					</p>
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
	return <p className="m-0 text-xs tracking-[0.18em] text-muted uppercase">{children}</p>;
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<p className="mt-4 border border-gold bg-paper px-4 py-3 text-sm" role="status">
			{children}
		</p>
	);
}

export function Flash({ code, saved }: { code?: string; saved?: boolean }) {
	if (code && FORM_ERRORS[code]) return <Notice>{FORM_ERRORS[code]}</Notice>;
	if (saved) return <Notice>Saved.</Notice>;
	return null;
}

export function Csrf() {
	const { csrf } = root.useLoaderData();
	return <input type="hidden" name="csrf" value={csrf} />;
}

export function Field(props: { id: string; label: string; name: string; type?: string; required?: boolean; defaultValue?: string; autoComplete?: string; testId?: string }) {
	return (
		<label className="text-sm" htmlFor={props.id}>
			{props.label}
			<input
				id={props.id}
				className={fieldClass}
				name={props.name}
				type={props.type ?? "text"}
				required={props.required}
				defaultValue={props.defaultValue}
				autoComplete={props.autoComplete}
				data-testid={props.testId}
			/>
		</label>
	);
}

export function AddressFields(props: { prefix: string; value?: { line1: string; line2: string; city: string; region: string; postal: string; country: string } | null }) {
	const value = props.value;
	return (
		<div className="grid gap-4">
			<Field id={`${props.prefix}-line1`} label="Address" name="line1" required defaultValue={value?.line1} autoComplete="address-line1" />
			<Field id={`${props.prefix}-line2`} label="Address line 2" name="line2" defaultValue={value?.line2} autoComplete="address-line2" />
			<div className="grid gap-4 sm:grid-cols-2">
				<Field id={`${props.prefix}-city`} label="City" name="city" required defaultValue={value?.city} autoComplete="address-level2" />
				<Field id={`${props.prefix}-region`} label="State or region" name="region" required defaultValue={value?.region} autoComplete="address-level1" />
				<Field id={`${props.prefix}-postal`} label="Postal code" name="postal" required defaultValue={value?.postal} autoComplete="postal-code" />
				<Field id={`${props.prefix}-country`} label="Country" name="country" required defaultValue={value?.country} autoComplete="country-name" />
			</div>
		</div>
	);
}

export function StaffNav() {
	const links = [
		["/staff", "Home"],
		["/staff/orders", "Pre-orders"],
		["/staff/signups", "Sign-ups"],
		["/staff/blasts", "Blasts"],
		["/staff/accounts", "Accounts"],
		["/staff/audit", "Audit"],
		["/staff/campaign", "Campaign"],
	] as const;
	return (
		<nav aria-label="Staff" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4 text-sm">
			{links.map(([to, label]) => (
				<Link key={to} to={to} className="text-ink no-underline">
					{label}
				</Link>
			))}
			<form method="post" action="/logout">
				<Csrf />
				<button className={quietButtonClass} type="submit">
					Sign out
				</button>
			</form>
		</nav>
	);
}

export function Denied({ title }: { title: string }) {
	return (
		<Page>
			<h1 className="font-serif text-4xl font-medium">{title}</h1>
			<p>Staff only.</p>
		</Page>
	);
}
