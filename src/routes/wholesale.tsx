import { createFileRoute, Link } from "@tanstack/react-router";
import { loadWholesale } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { Eyebrow, Page, quietButtonClass } from "#/ui/site.tsx";

export const Route = createFileRoute("/wholesale")({
	head: () => ({ meta: [{ title: "Wholesale | hmongtea.com" }] }),
	loader: () => loadWholesale(),
	component: WholesalePage,
});

function WholesalePage() {
	const data = Route.useLoaderData();
	return (
		<Page>
			<Eyebrow>Wholesale</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Wholesale</h1>
			<div className="my-6 h-px w-16 bg-gold" aria-hidden="true" />
			<p className="max-w-2xl">Wholesale accounts order KuabCha by the pack. The minimum is 12 packs. Staff approve each account before an order can be placed.</p>
			{data.kind === "retail" ? <p data-testid="retail-only">This account is retail. Wholesale prices stay on wholesale accounts.</p> : null}
			{data.kind === "pending" ? <p data-testid="wholesale-pending">This wholesale account is waiting for approval.</p> : null}
			{data.kind === "rejected" ? <p>This wholesale account was not approved.</p> : null}
			{data.tiers ? (
				<ul className="mt-6 grid max-w-md gap-2 border border-line bg-paper p-4" data-testid="wholesale-tiers">
					{data.tiers.map((tier) => (
						<li key={tier.label}>
							{tier.label} at {formatUsd(tier.unitCents)} each
						</li>
					))}
				</ul>
			) : null}
			{data.kind === "open" ? (
				<p className="text-sm text-muted">Net terms placeholder. This flag does not open a billing account. {data.netTerms ? "The flag is on for this account." : "The flag is off for this account."}</p>
			) : null}
			<div className="mt-6 flex flex-wrap gap-3">
				{data.kind === "guest" || data.kind === "retail" ? (
					<Link to="/wholesale/register" className={quietButtonClass}>
						Apply for wholesale
					</Link>
				) : null}
				{data.kind === "open" ? (
					<Link to="/wholesale/order" className={quietButtonClass}>
						Place a wholesale order
					</Link>
				) : null}
			</div>
		</Page>
	);
}
