import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffOrders } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	fieldClass,
	Money,
	Notes,
	Page,
	quietButtonClass,
	Status,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/orders/")({
	head: () => ({ meta: [{ title: "Orders, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loaderDeps: ({ search }) => ({
		q: search.q ?? "",
		side: search.side ?? "",
		status: search.status ?? "",
	}),
	loader: async ({ deps }) => {
		const page = await loadStaffOrders({ data: deps });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: StaffOrders,
});

function StaffOrders() {
	const page = Route.useLoaderData();
	const search = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	const csv = `/api/staff/orders-csv?q=${encodeURIComponent(search.q ?? "")}&side=${encodeURIComponent(search.side ?? "")}&status=${encodeURIComponent(search.status ?? "")}`;
	return (
		<Page>
			<Title eyebrow="Staff" title="Orders" />
			<Notes notes={search} />
			<form
				className="flex flex-wrap items-end gap-3"
				method="get"
				action="/staff/orders"
			>
				<label className="grid text-sm" htmlFor="q">
					Search
					<input
						id="q"
						className={fieldClass}
						name="q"
						defaultValue={search.q ?? ""}
					/>
				</label>
				<label className="grid text-sm" htmlFor="side">
					Side
					<select
						id="side"
						className={fieldClass}
						name="side"
						defaultValue={search.side ?? ""}
					>
						<option value="">Any</option>
						<option value="retail">Retail</option>
						<option value="wholesale">Partner</option>
					</select>
				</label>
				<label className="grid text-sm" htmlFor="status">
					Status
					<select
						id="status"
						className={fieldClass}
						name="status"
						defaultValue={search.status ?? ""}
					>
						<option value="">Any</option>
						<option value="unpaid">Unpaid</option>
						<option value="placed">Placed</option>
						<option value="shipped">Shipped</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</label>
				<button className={quietButtonClass} type="submit">
					Filter
				</button>
				<a className={quietButtonClass} href={csv}>
					Export CSV
				</a>
			</form>
			<div className="mt-6 overflow-x-auto">
				<table className="w-full border-collapse text-left text-sm">
					<thead>
						<tr className="border-b border-line">
							<th className="py-2 pr-3 font-medium">Date</th>
							<th className="py-2 pr-3 font-medium">Side</th>
							<th className="py-2 pr-3 font-medium">Plan</th>
							<th className="py-2 pr-3 font-medium">Status</th>
							<th className="py-2 pr-3 font-medium">Email</th>
							<th className="py-2 pr-3 font-medium">Total</th>
						</tr>
					</thead>
					<tbody>
						{page.orders.map((order) => (
							<tr key={order.id} className="border-b border-line">
								<td className="py-2 pr-3">
									<Link
										to="/staff/orders/$orderId"
										params={{ orderId: order.id }}
									>
										{order.createdAt.slice(0, 10)}
									</Link>
								</td>
								<td className="py-2 pr-3">
									{order.side === "wholesale" ? "Partner" : "Retail"}
								</td>
								<td className="py-2 pr-3">
									{order.purchasePlan === "subscription"
										? `Subscription, ${order.subscriptionIntervalWeeks} weeks`
										: "One-time"}
								</td>
								<td className="py-2 pr-3">
									<Status value={order.status} />
								</td>
								<td className="py-2 pr-3">{order.contactEmail}</td>
								<td className="py-2 pr-3">
									<Money cents={order.totalCents} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Page>
	);
}
