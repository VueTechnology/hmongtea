import { createFileRoute, Link } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import { MOQ, WHOLESALE_TIERS } from "#/domain/prices";
import { loadCheckout } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	AddressFields,
	buttonClass,
	Csrf,
	Field,
	fieldClass,
	Notes,
	Page,
	Title,
	useShell,
} from "#/ui/site";

export const Route = createFileRoute("/wholesale/order")({
	head: () => ({ meta: [{ title: "Partner order, hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadCheckout(),
	component: WholesaleOrder,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function WholesaleOrder() {
	const notes = Route.useSearch();
	const gate = Route.useLoaderData();
	const viewer = useShell().viewer;
	if (viewer && (viewer.role !== "customer" || viewer.side !== "wholesale"))
		return <Forbidden />;
	const approved = viewer?.status === "active";
	return (
		<Page>
			<Title eyebrow="Partner" title="New order" />
			<Notes notes={notes} />
			{!viewer ? (
				<p>
					<Link to="/login">Log in</Link> to place a partner order.
				</p>
			) : null}
			{viewer && !approved ? (
				<p>This partner application is waiting for staff approval.</p>
			) : null}
			{approved ? (
				<>
					<ul
						className="grid list-none gap-2 p-0"
						data-testid="wholesale-tiers"
					>
						{WHOLESALE_TIERS.map((tier) => (
							<li key={tier.minQty}>
								{tier.label}, {formatUsd(tier.unitCents)} each.
							</li>
						))}
					</ul>
					<p>The minimum is {MOQ} packs. Shipping is not added here.</p>
					{viewer?.netTerms ? (
						<p>
							Net terms is a placeholder flag. It does not open a credit line.
						</p>
					) : null}
					{gate.payment === "demo" && !viewer?.netTerms ? (
						<p>Demo checkout. No card is charged.</p>
					) : null}
					<form
						className="grid max-w-lg gap-4"
						method="post"
						action="/wholesale/order"
					>
						<Csrf />
						<label className="grid text-sm" htmlFor="qty">
							Packs
							<input
								id="qty"
								className={fieldClass}
								name="qty"
								type="number"
								min={MOQ}
								max={999}
								defaultValue={
									typeof notes.q === "string" && Number(notes.q) >= MOQ
										? Number(notes.q)
										: MOQ
								}
								required
							/>
						</label>
						<Field
							label="Contact name"
							name="contactName"
							required
							defaultValue={viewer?.name ?? ""}
						/>
						<AddressFields phone="" />
						<button className={buttonClass} type="submit">
							Place order
						</button>
					</form>
				</>
			) : null}
		</Page>
	);
}
