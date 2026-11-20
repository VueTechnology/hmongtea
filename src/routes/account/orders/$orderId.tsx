import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadOrder } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { OrderFacts } from "#/ui/order";
import { noteSearch } from "#/ui/search";
import {
	AddressFields,
	buttonClass,
	Csrf,
	Field,
	Notes,
	Page,
	quietButtonClass,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/account/orders/$orderId")({
	head: () => ({ meta: [{ title: "Order, hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async ({ params }) => {
		const page = await loadOrder({ data: params.orderId });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: OrderPage,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function OrderPage() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	const order = page.order;
	const open = order.status === "placed" || order.status === "unpaid";
	return (
		<Page>
			<Title eyebrow="Account" title="Order" />
			<Notes notes={notes} />
			<OrderFacts order={order} />
			{open ? (
				<div className="mt-8 grid max-w-lg gap-8">
					<form className="grid gap-4" method="post">
						<Csrf />
						<h2 className="m-0 font-serif text-3xl font-medium">
							Shipping and contact
						</h2>
						<Field
							label="Contact name"
							name="contactName"
							required
							defaultValue={order.contactName}
						/>
						<AddressFields
							line1={order.line1}
							line2={order.line2}
							city={order.city}
							region={order.region}
							postalCode={order.postalCode}
							country={order.country}
							phone={order.contactPhone}
						/>
						<button className={buttonClass} type="submit">
							Save changes
						</button>
					</form>
					<form method="post">
						<Csrf />
						<button
							className={quietButtonClass}
							name="action"
							value="cancel"
							type="submit"
						>
							Cancel this order
						</button>
					</form>
				</div>
			) : (
				<p className="mt-6">This order can no longer be changed.</p>
			)}
			<form method="post">
				<Csrf />
				<button
					className={buttonClass}
					name="action"
					value="reorder"
					type="submit"
				>
					Reorder
				</button>
			</form>
			<p>
				<Link to="/account">All orders</Link>
			</p>
		</Page>
	);
}
