import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffOrder } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { AddressFields, buttonClass, Csrf, Field, Flash, Notice, Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/orders/$id")({
	head: () => ({ meta: [{ title: "Staff pre-order | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async ({ params }) => {
		const data = await loadStaffOrder({ data: { id: params.id } });
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: StaffOrder,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postStaffOrder } = await import("#/server/post.ts");
				return postStaffOrder(request);
			},
		},
	},
});

function StaffOrder() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<StaffNav />
				<h1 className="font-serif text-4xl">Pre-order</h1>
				<p>{data.kind === "forbidden" ? "Staff only." : "No pre-order matches that link."}</p>
			</Page>
		);
	}
	const order = data.order;
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">{order.number}</h1>
			<p>
				{order.side} · {order.status} · {order.qty} at {formatUsd(order.unitCents)} · {order.tierLabel}
			</p>
			<Flash code={search.error} saved={search.saved === "1"} />
			{search.shipped === "1" ? <Notice>Marked shipped.</Notice> : null}
			{order.status === "placed" ? (
				<>
					<form className="mt-6 grid max-w-xl gap-4" method="post">
						<Csrf />
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="intent" value="save" />
						<Field id="staff-order-name" label="Contact name" name="contact_name" required defaultValue={order.contactName} />
						<Field id="staff-order-email" label="Email" name="contact_email" type="email" required defaultValue={order.contactEmail} />
						<Field id="staff-order-phone" label="Phone" name="contact_phone" defaultValue={order.contactPhone} />
						<AddressFields prefix="staff-order" value={order} />
						<button className={buttonClass} type="submit">
							Save pre-order
						</button>
					</form>
					<form className="mt-6 grid max-w-md gap-4" method="post">
						<Csrf />
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="intent" value="ship" />
						<Field id="ship-date" label="Ship date" name="ship_date" type="date" required testId="ship-date" />
						<Field id="tracking" label="Tracking number" name="tracking_number" required testId="tracking" />
						<button className={buttonClass} type="submit">
							Mark shipped
						</button>
					</form>
				</>
			) : (
				<p data-testid="staff-tracking">
					{order.shipDate} {order.trackingNumber}
				</p>
			)}
			{order.status === "cancelled" ? (
				<form className="mt-4" method="post">
					<Csrf />
					<input type="hidden" name="id" value={order.id} />
					<input type="hidden" name="intent" value="delete" />
					<button className={quietButtonClass} type="submit">
						Delete cancelled pre-order
					</button>
				</form>
			) : null}
		</Page>
	);
}
