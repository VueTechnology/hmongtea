import { createFileRoute } from "@tanstack/react-router";
import { loadTea } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { buttonClass, Csrf, Eyebrow, Flash, Page, quietButtonClass } from "#/ui/site.tsx";
import { noteSearch } from "#/search.ts";

const PHOTOS = [
	["/products/front.jpg", "Front of the KuabCha pack"],
	["/products/back.jpg", "Back of the KuabCha pack"],
	["/products/side.jpg", "Side of the KuabCha pack"],
	["/products/bag.jpg", "KuabCha loose leaf"],
] as const;

export const Route = createFileRoute("/tea")({
	head: () => ({ meta: [{ title: "KuabCha | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadTea(),
	component: TeaPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postCart } = await import("#/server/post.ts");
				return postCart(request);
			},
		},
	},
});

function TeaPage() {
	const book = Route.useLoaderData();
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>KuabCha</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Loose-leaf green tea</h1>
			<div className="my-6 h-px w-16 bg-gold" aria-hidden="true" />
			<p className="max-w-2xl">Loose-leaf green tea from the Golden Triangle foothills in Chiang Rai, Thailand. The pick is the top three leaves. The tea is low in caffeine.</p>
			<Flash code={search.error} />
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				{PHOTOS.map(([src, alt]) => (
					<img key={src} src={src} alt={alt} className="border border-line bg-paper" />
				))}
			</div>
			{book.side === "retail" && book.unitCents ? (
				<form className="mt-8 grid max-w-sm gap-4" method="post" action="/tea">
					<Csrf />
					<input type="hidden" name="intent" value="add" />
					<p className="m-0 font-serif text-3xl" data-testid="retail-price">
						{formatUsd(book.unitCents)} a pack
					</p>
					<label className="text-sm" htmlFor="tea-qty">
						Packs
						<input id="tea-qty" className="mt-1 block w-full min-h-11 border border-line bg-paper px-3 py-2" name="qty" type="number" min={1} max={99} defaultValue={1} required />
					</label>
					<button className={buttonClass} type="submit">
						Add to cart
					</button>
				</form>
			) : null}
			{book.side === "wholesale" ? (
				<section className="mt-8 max-w-xl border border-line bg-paper p-4" data-testid="wholesale-prices">
					<h2 className="m-0 font-serif text-3xl font-medium">Wholesale packs</h2>
					{book.orderable && book.tiers ? (
						<ul className="mt-4 grid gap-2">
							{book.tiers.map((tier) => (
								<li key={tier.label}>
									{tier.label} at {formatUsd(tier.unitCents)} each
								</li>
							))}
						</ul>
					) : (
						<p data-testid="wholesale-pending">This wholesale account is waiting for approval.</p>
					)}
					{book.orderable ? (
						<a className={quietButtonClass} href="/wholesale/order">
							Place a wholesale order
						</a>
					) : null}
				</section>
			) : null}
		</Page>
	);
}
