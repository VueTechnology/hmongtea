import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadAccount } from "#/fn.ts";
import { formatUsd, formatWhen } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Field, Flash, Notice, Page, quietButtonClass } from "#/ui/site.tsx";

export const Route = createFileRoute("/account/")({
	head: () => ({ meta: [{ title: "Account | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const data = await loadAccount();
		if (data.kind === "login") throw redirect({ to: "/login" });
		return data;
	},
	component: AccountPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postAccount } = await import("#/server/post.ts");
				return postAccount(request);
			},
		},
	},
});

function AccountPage() {
	const data = Route.useLoaderData();
	if (data.kind !== "ok") return null;
	const search = Route.useSearch();
	const account = data.account;
	return (
		<Page>
			<Eyebrow>{account.accountType === "wholesale" ? "Wholesale account" : "Retail account"}</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">{account.name || account.email}</h1>
			<Flash code={search.error} saved={search.saved === "1"} />
			{account.status === "pending" ? <Notice>This wholesale account is waiting for staff approval.</Notice> : null}
			{account.status === "rejected" ? <Notice>This wholesale account was not approved.</Notice> : null}
			{data.tax ? (
				<p data-testid="tax-masked">
					Tax ID {data.tax.masked}
				</p>
			) : null}
			{account.accountType === "wholesale" ? (
				<p className="text-sm text-muted">Net terms placeholder. This flag does not open a billing account. {data.netTerms ? "On." : "Off."}</p>
			) : null}
			<h2 className="mt-10 font-serif text-3xl font-medium">Pre-orders</h2>
			{data.orders.length === 0 ? <p>You have no pre-orders yet.</p> : null}
			<ul className="mt-4 grid gap-3">
				{data.orders.map((order) => (
					<li key={order.id} className="border border-line bg-paper p-4">
						<Link to="/account/orders/$id" params={{ id: order.id }} className="font-serif text-2xl text-ink no-underline">
							{order.number}
						</Link>
						<p className="m-0 text-sm text-muted">
							{order.side} · {order.status} · {formatUsd(order.totalCents)} · {formatWhen(order.createdAt)}
						</p>
					</li>
				))}
			</ul>
			<h2 className="mt-10 font-serif text-3xl font-medium">Contact</h2>
			<form className="mt-4 grid max-w-md gap-4" method="post" action="/account">
				<Csrf />
				<input type="hidden" name="intent" value="contact" />
				<Field id="account-name" label="Name" name="name" required defaultValue={account.name} />
				<Field id="account-email" label="Email" name="email" type="email" required defaultValue={account.email} />
				<Field id="account-phone" label="Phone" name="phone" defaultValue={account.phone} />
				<button className={buttonClass} type="submit">
					Save contact
				</button>
			</form>
			<form className="mt-4" method="post" action="/account">
				<Csrf />
				<input type="hidden" name="intent" value={account.emailOptOut ? "optin" : "optout"} />
				<button className={quietButtonClass} type="submit">
					{account.emailOptOut ? "Receive update emails again" : "Stop update emails"}
				</button>
			</form>
			{data.address ? (
				<form className="mt-4" method="post" action="/account">
					<Csrf />
					<input type="hidden" name="intent" value="delete-address" />
					<button className={quietButtonClass} type="submit">
						Delete saved address
					</button>
				</form>
			) : null}
			<form className="mt-6" method="post" action="/logout">
				<Csrf />
				<button className={quietButtonClass} type="submit">
					Sign out
				</button>
			</form>
		</Page>
	);
}
