import { createFileRoute, Link } from "@tanstack/react-router";
import { loadCheckout } from "#/fn.ts";
import { noteSearch } from "#/search.ts";
import { AddressFields, buttonClass, Csrf, Eyebrow, Flash, Field, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/checkout")({
	head: () => ({ meta: [{ title: "Checkout | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadCheckout(),
	component: CheckoutPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postCheckout } = await import("#/server/post.ts");
				return postCheckout(request);
			},
		},
	},
});

function CheckoutPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Retail pre-order</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Checkout</h1>
			<Flash code={search.error} />
			<p data-testid="payment-label">{data.payment}</p>
			{!data.viewer ? (
				<p>
					<Link to="/login">Sign in</Link> to place a pre-order.
				</p>
			) : data.viewer.accountType === "wholesale" ? (
				<p>
					Wholesale orders use the <Link to="/wholesale/order">wholesale form</Link>.
				</p>
			) : data.cartCount === 0 ? (
				<p>
					Add a pack from the <Link to="/tea">tea page</Link> first.
				</p>
			) : (
				<form className="mt-6 grid max-w-xl gap-4" method="post" action="/checkout">
					<Csrf />
					<Field id="checkout-name" label="Contact name" name="contact_name" required defaultValue={data.viewer.name} autoComplete="name" />
					<Field id="checkout-phone" label="Phone" name="contact_phone" defaultValue={data.viewer.phone} autoComplete="tel" />
					<AddressFields prefix="checkout" value={data.address} />
					<button className={buttonClass} type="submit" disabled={data.refused}>
						Place pre-order
					</button>
				</form>
			)}
		</Page>
	);
}
