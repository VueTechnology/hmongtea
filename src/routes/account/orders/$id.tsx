import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadOrder } from "#/fn.ts";
import { formatUsd, formatWhen } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { AddressFields, buttonClass, Csrf, Eyebrow, Field, Flash, Notice, Page, quietButtonClass } from "#/ui/site.tsx";

export const Route = createFileRoute("/account/orders/$id")({
	head: () => ({ meta: [{ title: "Pre-order | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async ({ params }) => {
		const data = await loadOrder({ data: { id: params.id } });
		if (data.kind === "login") throw redirect({ to: "/login" });
		return data;
	},
	component: OrderPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postCustomerOrder } = await import("#/server/post.ts");
				return postCustomerOrder(request);
			},
		},
	},
});

function OrderPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind === "forbidden") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Pre-order</h1>
				<p>That action is not available for this account.</p>
			</Page>
		);
	}
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Pre-order</h1>
				<p>No pre-order matches that link.</p>
				<Link to="/account">Back to the account</Link>
			</Page>
		);
	}
	const order = data.order;
	return (
		<Page>
			<Eyebrow>{order.side === "wholesale" ? "Wholesale pre-order" : "Retail pre-order"}</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">{order.number}</h1>
			<Flash code={search.error} saved={search.saved === "1"} />
			{search.placed === "1" ? <Notice>Pre-order placed.</Notice> : null}
			{search.cancelled === "1" ? <Notice>Pre-order cancelled.</Notice> : null}
			<p data-testid="order-status">
				{order.status} · {order.qty} packs · {formatUsd(order.totalCents)} · {order.tierLabel}
			</p>
			<p className="text-sm text-muted">{formatWhen(order.createdAt)} · {order.paymentStatus}</p>
			{order.status === "shipped" ? (
				<p data-testid="order-tracking">
					Shipped {order.shipDate}. Tracking {order.trackingNumber}.
				</p>
			) : null}
			{order.status === "placed" ? (
				<>
					<h2 className="mt-8 font-serif text-3xl font-medium">Shipping and contact</h2>
					<form className="mt-4 grid max-w-xl gap-4" method="post">
						<Csrf />
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="intent" value="save" />
						<Field id="order-name" label="Contact name" name="contact_name" required defaultValue={order.contactName} />
						<Field id="order-email" label="Email" name="contact_email" type="email" required defaultValue={order.contactEmail} />
						<Field id="order-phone" label="Phone" name="contact_phone" defaultValue={order.contactPhone} />
						<AddressFields prefix="order" value={order} />
						<button className={buttonClass} type="submit">
							Save changes
						</button>
					</form>
					<form className="mt-4" method="post">
						<Csrf />
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="intent" value="cancel" />
						<button className={quietButtonClass} type="submit">
							Cancel pre-order
						</button>
					</form>
				</>
			) : (
				<p>
					{order.line1}, {order.city} {order.region} {order.postal}
				</p>
			)}
		</Page>
	);
}
