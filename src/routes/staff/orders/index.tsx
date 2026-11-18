import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffOrders } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { fieldClass, Flash, Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/orders/")({
	head: () => ({ meta: [{ title: "Pre-orders | hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		...noteSearch(search),
		q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
		status: typeof search.status === "string" ? search.status : "",
		side: typeof search.side === "string" ? search.side : "",
	}),
	loaderDeps: ({ search }) => ({ q: search.q, status: search.status, side: search.side }),
	loader: async ({ deps }) => {
		const data = await loadStaffOrders({ data: deps });
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: OrdersPage,
});

function OrdersPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Pre-orders</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Pre-orders</h1>
			<Flash code={search.error} saved={search.deleted === "1"} />
			<form className="mt-4 flex flex-wrap gap-3" method="get" action="/staff/orders">
				<label className="text-sm">
					Search
					<input className={fieldClass} name="q" defaultValue={search.q} />
				</label>
				<label className="text-sm">
					Status
					<select className={fieldClass} name="status" defaultValue={search.status}>
						<option value="">Any</option>
						<option value="placed">Placed</option>
						<option value="shipped">Shipped</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</label>
				<label className="text-sm">
					Side
					<select className={fieldClass} name="side" defaultValue={search.side}>
						<option value="">Any</option>
						<option value="retail">Retail</option>
						<option value="wholesale">Wholesale</option>
					</select>
				</label>
				<button className={quietButtonClass} type="submit">
					Filter
				</button>
			</form>
			<ul className="mt-6 grid gap-3">
				{data.orders.map((order) => (
					<li key={order.id} className="border border-line bg-paper p-4" data-testid="staff-order">
						<Link to="/staff/orders/$id" params={{ id: order.id }} className="font-serif text-2xl text-ink no-underline">
							{order.number}
						</Link>
						<p className="m-0 text-sm">
							{order.side} · {order.status} · {order.contactName} · {order.contactEmail} · {formatUsd(order.totalCents)}
						</p>
					</li>
				))}
			</ul>
			{data.orders.length === 0 ? <p>No pre-orders match.</p> : null}
		</Page>
	);
}
