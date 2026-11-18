import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffCustomers } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { buttonClass, Csrf, Page, quietButtonClass, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/customers")({
	head: () => ({ meta: [{ title: "Customers, hmongtea.com staff" }] }),
	loader: async () => {
		const page = await loadStaffCustomers();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Customers,
});

function Customers() {
	const page = Route.useLoaderData();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Customers" />
			<p>
				<Link className={quietButtonClass} to="/staff/accounts">
					New account
				</Link>
			</p>
			{page.customers.length === 0 ? <p>No customer accounts yet.</p> : null}
			<ul className="grid list-none gap-3 p-0">
				{page.customers.map((customer) => (
					<li key={customer.id} className="border border-line bg-paper p-4">
						<p className="m-0 font-serif text-2xl">
							{customer.name || "Customer"}
						</p>
						<p className="m-0 mt-1 text-sm">{customer.email}</p>
						{customer.phone ? (
							<p className="m-0 text-sm text-muted">{customer.phone}</p>
						) : null}
						<form method="post" action="/staff/password-reset">
							<Csrf />
							<input type="hidden" name="email" value={customer.email} />
							<input type="hidden" name="back" value="/staff/customers" />
							<button className={buttonClass} type="submit">
								Send password reset
							</button>
						</form>
					</li>
				))}
			</ul>
		</Page>
	);
}
