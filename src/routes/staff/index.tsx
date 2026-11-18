import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffHome } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/")({
	head: () => ({ meta: [{ title: "Staff, hmongtea.com" }] }),
	loader: async () => {
		const page = await loadStaffHome();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: StaffHome,
});

function StaffHome() {
	const page = Route.useLoaderData();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="hmongtea.com" />
			<ul className="grid list-none gap-3 p-0">
				<li>
					<Link to="/staff/orders">{page.orders} orders</Link>
				</li>
				<li>
					<Link to="/staff/signups">{page.signups} update sign-ups</Link>
				</li>
				<li>
					<Link to="/staff/wholesale">
						{page.pending} partner applications waiting
					</Link>
				</li>
			</ul>
		</Page>
	);
}
