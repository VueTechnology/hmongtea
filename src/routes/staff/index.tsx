import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffHome } from "#/fn.ts";
import { Denied, Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/")({
	head: () => ({ meta: [{ title: "Staff | hmongtea.com" }] }),
	loader: async () => {
		const data = await loadStaffHome();
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: StaffHome,
});

function StaffHome() {
	const data = Route.useLoaderData();
	if (data.kind !== "ok") return <Denied title="Staff" />;
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Staff</h1>
			<p>
				{data.preorders} pre-orders on this list. {data.accounts} accounts.
			</p>
			<a className={quietButtonClass} href="/staff/export">
				Export CSV
			</a>
			<ul className="mt-6 grid gap-3">
				{data.orders.map((order) => (
					<li key={order.id} className="border border-line bg-paper p-4">
						<Link to="/staff/orders/$id" params={{ id: order.id }} className="text-ink no-underline">
							{order.number}
						</Link>
						<p className="m-0 text-sm text-muted">
							{order.side} · {order.status} · {order.contactEmail}
						</p>
					</li>
				))}
			</ul>
		</Page>
	);
}
