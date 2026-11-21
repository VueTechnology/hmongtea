import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadAccount } from "#/server/fns";
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
} from "#/ui/site";

export const Route = createFileRoute("/account/")({
	head: () => ({ meta: [{ title: "Account, hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadAccount();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Account,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Account() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Account" title="Your orders" />
			<Notes notes={notes} />
			{page.orders.length === 0 ? <p>No orders yet.</p> : null}
			<ul className="grid list-none gap-3 p-0">
				{page.orders.map((order) => (
					<li key={order.id} className="border border-line bg-paper p-4">
						<Link
							to="/account/orders/$orderId"
							params={{ orderId: order.id }}
							className="font-serif text-2xl text-ink"
						>
							{order.createdAt.slice(0, 10)}
						</Link>
						<p className="m-0 mt-2 text-sm">
							<Status value={order.status} />, {order.qty}{" "}
							{order.qty === 1 ? "pack" : "packs"},{" "}
							<Money cents={order.totalCents} />
						</p>
						{order.purchasePlan === "subscription" ? (
							<p className="m-0 mt-2 text-sm">
								Subscription {order.subscriptionStatus}. Open the order to skip,
								change or cancel.
							</p>
						) : null}
						{order.placedByStaffId ? (
							<p className="m-0 text-sm">Placed by staff.</p>
						) : null}
					</li>
				))}
			</ul>
			<section className="mt-10 max-w-md" aria-labelledby="contact-heading">
				<h2 id="contact-heading" className="font-serif text-3xl font-medium">
					Contact
				</h2>
				<form className="grid gap-4" method="post" action="/account">
					<Csrf />
					<Field
						label="Name"
						name="name"
						required
						defaultValue={page.contact.name}
						autoComplete="name"
					/>
					<Field
						label="Email"
						name="email"
						type="email"
						required
						defaultValue={page.contact.email}
						autoComplete="email"
					/>
					<Field
						label="Phone"
						name="phone"
						defaultValue={page.contact.phone}
						autoComplete="tel"
					/>
					<button className={buttonClass} type="submit">
						Save contact
					</button>
				</form>
			</section>
		</Page>
	);
}
