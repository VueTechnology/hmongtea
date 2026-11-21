import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonClass, Page, quietButtonClass, Title } from "#/ui/site";

export const Route = createFileRoute("/checkout/done")({
	head: () => ({ meta: [{ title: "Order placed, hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		order: typeof search.order === "string" ? search.order.slice(0, 40) : "",
		claim: typeof search.claim === "string" ? search.claim.slice(0, 200) : "",
		payment: search.payment === "stripe" ? "stripe" : "",
	}),
	component: Done,
});

function Done() {
	const search = Route.useSearch();
	const claimQuery = new URLSearchParams({
		order: search.order,
		claim: search.claim,
	});
	return (
		<Page>
			<Title eyebrow="Shop" title="Order recorded" />
			{search.payment === "stripe" ? (
				<p>The card payment is waiting for confirmation.</p>
			) : (
				<p>Demo checkout recorded the order. No card was charged.</p>
			)}
			{search.order && search.claim ? (
				<section
					className="grid max-w-lg gap-4"
					aria-labelledby="receipt-account"
				>
					<h2 id="receipt-account">Save this order in your account</h2>
					<p>
						Create an account or log in with the same email to see the order and
						manage any subscription.
					</p>
					<a className={buttonClass} href={`/register?${claimQuery}`}>
						Create an account
					</a>
					<a className={quietButtonClass} href={`/login?${claimQuery}`}>
						Log in and link the order
					</a>
				</section>
			) : search.order ? (
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
