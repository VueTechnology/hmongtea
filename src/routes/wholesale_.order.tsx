import { createFileRoute, Link } from "@tanstack/react-router";
import { loadWholesale } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { AddressFields, buttonClass, Csrf, Eyebrow, Field, Flash, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/wholesale_/order")({
	head: () => ({ meta: [{ title: "Wholesale order | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadWholesale(),
	component: WholesaleOrder,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postWholesaleOrder } = await import("#/server/post.ts");
				return postWholesaleOrder(request);
			},
		},
	},
});

function WholesaleOrder() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Wholesale</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Wholesale order</h1>
			<Flash code={search.error} />
			{data.kind === "retail" ? <p data-testid="retail-blocked">This retail account cannot place a wholesale order.</p> : null}
			{data.kind === "pending" ? <p data-testid="pending-blocked">This wholesale account is waiting for approval.</p> : null}
			{data.kind === "guest" ? (
				<p>
					<Link to="/login">Sign in</Link> with an approved wholesale account.
				</p>
			) : null}
			{data.kind === "open" && data.tiers ? (
				<form className="mt-6 grid max-w-xl gap-4" method="post" action="/wholesale/order">
					<Csrf />
					<ul className="grid gap-2" data-testid="order-tiers">
						{data.tiers.map((tier) => (
							<li key={tier.label} data-testid="tier-price">
								{tier.label} at {formatUsd(tier.unitCents)}
							</li>
						))}
					</ul>
					<label className="text-sm" htmlFor="ws-qty">
						Packs, minimum 12
						<input id="ws-qty" className="mt-1 block w-full min-h-11 border border-line bg-paper px-3 py-2" name="qty" type="number" min={12} max={999} defaultValue={12} required data-testid="ws-qty" />
					</label>
					<Field id="ws-order-name" label="Contact name" name="contact_name" required />
					<Field id="ws-order-phone" label="Phone" name="contact_phone" required />
					<AddressFields prefix="ws-order" />
					<button className={buttonClass} type="submit">
						Place wholesale order
					</button>
				</form>
			) : null}
		</Page>
	);
}
