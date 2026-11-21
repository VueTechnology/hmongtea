import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadWholesaleDesk } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	Field,
	Money,
	Notes,
	Page,
	Status,
	Title,
	useShell,
} from "#/ui/site";

export const Route = createFileRoute("/wholesale/desk")({
	head: () => ({ meta: [{ title: "Partner orders, hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadWholesaleDesk();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Desk,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Desk() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	const viewer = useShell().viewer;
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Partner" title={page.legalName || "Your account"} />
			<Notes notes={notes} />
			<p>
				Status <Status value={page.status} />.
				{page.taxMask ? (
					<>
						{" "}
						Tax ID <span data-testid="tax-id">{page.taxMask}</span>.
					</>
				) : null}
			</p>
			{page.status === "pending" ? (
				<p>This partner application is waiting for staff approval.</p>
			) : null}
			{page.status === "rejected" ? (
				<p>Staff declined this application.</p>
			) : null}
			{page.netTerms ? (
				<p>Net terms is a placeholder flag. It does not open a credit line.</p>
			) : null}
			{page.canOrder ? (
				<p>
					<Link to="/wholesale/order">Place an order</Link>
				</p>
			) : null}
			<ul className="grid list-none gap-3 p-0">
				{page.orders.map((order) => (
					<li key={order.id} className="border border-line bg-paper p-4">
						<Link
							to="/wholesale/orders/$orderId"
							params={{ orderId: order.id }}
							className="font-serif text-2xl text-ink"
						>
							{order.createdAt.slice(0, 10)}
						</Link>
						<p className="m-0 mt-2 text-sm">
							<Status value={order.status} />,{" "}
							{order.qty} {order.qty === 1 ? "pack" : "packs"},{" "}
							<Money cents={order.totalCents} />
						</p>
						{order.placedByStaffId ? (
							<p className="m-0 text-sm">Placed by staff.</p>
						) : null}
					</li>
				))}
			</ul>
			<section className="mt-10 max-w-md">
				<h2 className="font-serif text-3xl font-medium">Contact</h2>
				<form className="grid gap-4" method="post" action="/wholesale/desk">
					<Csrf />
					<Field
						label="Name"
						name="name"
						required
						defaultValue={viewer?.name ?? page.contactPerson}
					/>
					<Field
						label="Email"
						name="email"
						type="email"
						required
						defaultValue={viewer?.email ?? ""}
					/>
					<Field label="Phone" name="phone" defaultValue={page.businessPhone} />
					<button className={buttonClass} type="submit">
						Save contact
					</button>
				</form>
			</section>
		</Page>
	);
}
