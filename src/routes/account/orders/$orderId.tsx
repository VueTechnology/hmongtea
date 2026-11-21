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
	fieldClass,
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
			{order.purchasePlan === "subscription" ? (
				<section
					className="mt-8 grid max-w-lg gap-4 border border-line bg-paper p-4"
					aria-labelledby="subscription-heading"
				>
					<h2
						id="subscription-heading"
						className="m-0 font-serif text-3xl font-medium"
					>
						Subscription
					</h2>
					<p className="m-0">
						{order.subscriptionStatus === "active" ? "Active" : "Cancelled"}.
						{order.subscriptionIntervalWeeks
							? ` Every ${order.subscriptionIntervalWeeks} weeks.`
							: ""}
					</p>
					{order.nextOrderOn ? (
						<p className="m-0">Next order date {order.nextOrderOn}.</p>
					) : null}
					{order.subscriptionStatus === "active" ? (
						<div className="grid gap-4">
							<form method="post">
								<Csrf />
								<button
									className={quietButtonClass}
									name="action"
									value="skip"
									type="submit"
								>
									Skip the next order
								</button>
							</form>
							<form className="grid gap-4" method="post">
								<Csrf />
								<label className="grid text-sm" htmlFor="subscription-interval">
									Delivery interval in weeks
									<input
										id="subscription-interval"
										className={fieldClass}
										name="intervalWeeks"
										type="number"
										min={1}
										max={52}
										defaultValue={order.subscriptionIntervalWeeks ?? 4}
										required
									/>
								</label>
								<button
									className={buttonClass}
									name="action"
									value="change-interval"
									type="submit"
								>
									Change interval
								</button>
							</form>
							<form method="post">
								<Csrf />
								<button
									className={quietButtonClass}
									name="action"
									value="cancel-subscription"
									type="submit"
								>
									Cancel subscription
								</button>
							</form>
						</div>
					) : null}
				</section>
			) : null}
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
