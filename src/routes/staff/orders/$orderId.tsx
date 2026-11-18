import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffOrder } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { OrderFacts } from "#/ui/order";
import { noteSearch } from "#/ui/search";
import {
	AddressFields,
	buttonClass,
	Csrf,
	Field,
	fieldClass,
	Notes,
	Page,
	quietButtonClass,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/orders/$orderId")({
	head: () => ({ meta: [{ title: "Order, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async ({ params }) => {
		const page = await loadStaffOrder({ data: params.orderId });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: StaffOrder,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function StaffOrder() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	const order = page.order;
	const open = order.status === "placed" || order.status === "unpaid";
	return (
		<Page>
			<Title eyebrow="Staff" title="Order" />
			<Notes notes={notes} />
			<OrderFacts order={order} />
			<p className="text-sm text-muted">{order.contactEmail}</p>
			{open ? (
				<form className="mt-8 grid max-w-lg gap-4" method="post">
					<Csrf />
					<h2 className="m-0 font-serif text-3xl font-medium">Edit</h2>
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
					<label className="grid text-sm" htmlFor="qty">
						Packs
						<input
							id="qty"
							className={fieldClass}
							name="qty"
							type="number"
							min={1}
							max={999}
							defaultValue={order.qty}
							required
						/>
					</label>
					<button className={buttonClass} type="submit">
						Save
					</button>
				</form>
			) : null}
			{open ? (
				<form className="mt-8 grid max-w-lg gap-4" method="post">
					<Csrf />
					<h2 className="m-0 font-serif text-3xl font-medium">Ship</h2>
					<label className="grid text-sm" htmlFor="shipDate">
						Ship date
						<input
							id="shipDate"
							className={fieldClass}
							name="shipDate"
							type="date"
							required
						/>
					</label>
					<Field label="Tracking number" name="tracking" required />
					<button
						className={buttonClass}
						name="action"
						value="ship"
						type="submit"
					>
						Mark shipped
					</button>
				</form>
			) : null}
			{open ? (
				<form className="mt-8" method="post">
					<Csrf />
					<button
						className={quietButtonClass}
						name="action"
						value="cancel"
						type="submit"
					>
						Cancel order
					</button>
				</form>
			) : null}
			{order.status === "cancelled" ? (
				<form className="mt-8" method="post">
					<Csrf />
					<button
						className={quietButtonClass}
						name="action"
						value="delete"
						type="submit"
					>
						Delete cancelled order
					</button>
				</form>
			) : null}
			<p>
				<Link to="/staff/orders">All orders</Link>
			</p>
		</Page>
	);
}
