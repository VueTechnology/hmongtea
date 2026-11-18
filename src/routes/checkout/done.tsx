import { createFileRoute, Link } from "@tanstack/react-router";
import { Page, quietButtonClass, Title } from "#/ui/site";

export const Route = createFileRoute("/checkout/done")({
	head: () => ({ meta: [{ title: "Order placed, hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		order: typeof search.order === "string" ? search.order.slice(0, 40) : "",
		payment: search.payment === "stripe" ? "stripe" : "",
	}),
	component: Done,
});

function Done() {
	const search = Route.useSearch();
	return (
		<Page>
			<Title eyebrow="Shop" title="Order recorded" />
			{search.payment === "stripe" ? (
				<p>The card payment is waiting for confirmation.</p>
			) : (
				<p>Demo checkout recorded the order. No card was charged.</p>
			)}
			{search.order ? (
				<Link
					to="/account/orders/$orderId"
					params={{ orderId: search.order }}
					className={quietButtonClass}
				>
					View the order
				</Link>
			) : (
				<Link to="/account" className={quietButtonClass}>
					Account
				</Link>
			)}
		</Page>
	);
}
