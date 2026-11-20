import { createFileRoute, Link } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import { RETAIL_CENTS } from "#/domain/prices";
import { loadCheckout } from "#/server/fns";
import { noteSearch } from "#/ui/search";
import {
	AddressFields,
	buttonClass,
	Csrf,
	Field,
	Notes,
	Page,
	Title,
	useShell,
} from "#/ui/site";

export const Route = createFileRoute("/checkout/")({
	head: () => ({ meta: [{ title: "Checkout, hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadCheckout(),
	component: Checkout,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Checkout() {
	const notes = Route.useSearch();
	const gate = Route.useLoaderData();
	const shell = useShell();
	const viewer = shell.viewer;
	const qty = shell.cartQty;
	const retail = viewer?.role === "customer" && viewer.side === "retail";
	return (
		<Page>
			<Title eyebrow="Retail" title="Checkout" />
			<Notes notes={notes} />
			{gate.payment === "demo" ? (
				<p>Demo checkout. No card is charged.</p>
			) : null}
			{gate.payment === "refused" ? (
				<p>
					Checkout is paused. The payment keys on this server are not a matching
					test pair.
				</p>
			) : null}
			{!viewer ? (
				<p>
					<Link to="/login">Log in</Link> or{" "}
					<Link to="/register">register</Link> before checkout.
				</p>
			) : null}
			{viewer && !retail ? (
				<p>Partner accounts order from the partner desk.</p>
			) : null}
			{retail && qty < 1 ? (
				<p>
					Your cart is empty. <Link to="/tea">Add a pack.</Link>
				</p>
			) : null}
			{retail && qty > 0 ? (
				<form className="grid max-w-lg gap-4" method="post" action="/checkout">
					<Csrf />
					<p className="m-0">
						{qty} packs at {formatUsd(RETAIL_CENTS)}. Total{" "}
						<span data-testid="order-total">
							{formatUsd(qty * RETAIL_CENTS)}
						</span>
						.
					</p>
					<Field
						label="Contact name"
						name="contactName"
						required
						defaultValue={viewer.name}
						autoComplete="name"
					/>
					<AddressFields />
					<button className={buttonClass} type="submit">
						Place order
					</button>
				</form>
			) : null}
		</Page>
	);
}
