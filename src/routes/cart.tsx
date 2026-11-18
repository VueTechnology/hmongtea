import { createFileRoute, Link } from "@tanstack/react-router";
import { loadCart } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Flash, Page, quietButtonClass } from "#/ui/site.tsx";

export const Route = createFileRoute("/cart")({
	head: () => ({ meta: [{ title: "Cart | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadCart(),
	component: CartPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postCart } = await import("#/server/post.ts");
				return postCart(request);
			},
		},
	},
});

function CartPage() {
	const cart = Route.useLoaderData();
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Retail</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Cart</h1>
			<Flash code={search.error} />
			{cart.qty === 0 ? (
				<p className="mt-6">
					The cart is empty. <Link to="/tea">See the tea</Link>
				</p>
			) : (
				<div className="mt-6 max-w-md border border-line bg-paper p-4">
					<p className="m-0 font-serif text-2xl">KuabCha loose leaf</p>
					<p className="m-0" data-testid="cart-qty">
						{cart.qty} packs at {formatUsd(cart.unitCents)}
					</p>
					<p className="m-0">{formatUsd(cart.totalCents)}</p>
					<form className="mt-4 flex flex-wrap gap-3" method="post" action="/cart">
						<Csrf />
						<input type="hidden" name="intent" value="remove" />
						<button className={quietButtonClass} type="submit">
							Remove
						</button>
					</form>
					<Link to="/checkout" className={`${buttonClass} mt-4`}>
						Checkout
					</Link>
				</div>
			)}
		</Page>
	);
}
