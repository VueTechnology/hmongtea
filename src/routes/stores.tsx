import { createFileRoute } from "@tanstack/react-router";
import { loadStores } from "#/server/fns";
import { BuyBox } from "#/ui/buy-box";
import { noteSearch } from "#/ui/search";
import { Page, quietButtonClass, Title } from "#/ui/site";

export const Route = createFileRoute("/stores")({
	head: () => ({
		meta: [
			{ title: "Local Hmong stores | HmongTea" },
			{
				name: "description",
				content:
					"Find KuabCha whole-leaf green tea at your local Hmong store, or order online.",
			},
		],
	}),
	validateSearch: (search: Record<string, unknown>) => ({
		...noteSearch(search),
		q: typeof search.q === "string" ? search.q.slice(0, 12) : "",
	}),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ deps }) => loadStores({ data: deps.q }),
	component: Stores,
});

function Stores() {
	const page = Route.useLoaderData();
	const search = Route.useSearch();
	const stores = page.stores;
	const hasQuery = search.q.length > 0;
	return (
		<Page>
			<Title
				eyebrow="HmongTea"
				title="Find KuabCha at your local Hmong store"
			/>
			<p className="max-w-2xl">
				Rather shop in person? Look for KuabCha at your local Hmong store.
			</p>
			<form className="mt-6 flex max-w-md gap-3" method="get" action="/stores">
				<label className="sr-only" htmlFor="store-query">
					Search by city or ZIP
				</label>
				<input
					id="store-query"
					name="q"
					type="search"
					defaultValue={search.q}
					placeholder="City or ZIP"
					className="min-h-12 flex-1 rounded-xl border border-line bg-paper px-4 text-base"
				/>
				<button className={quietButtonClass} type="submit">
					Search
				</button>
			</form>
			{stores.length === 0 ? (
				<div className="mt-8 border border-line bg-paper p-6">
					<p className="m-0">
						{hasQuery
							? "No listed stores match that city or ZIP yet."
							: "Store list coming soon. Ask at your local Hmong store, or order online."}
					</p>
					<div className="mt-6">
						<BuyBox id="stores" sticky={false} />
					</div>
				</div>
			) : (
				<ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
					{stores.map((store) => (
						<li key={store.id} className="border border-line bg-paper p-5">
							<h2 className="m-0 font-serif text-2xl">
								{store.name}
								{store.sample ? (
									<span className="ml-2 align-middle text-xs font-bold tracking-wide text-muted uppercase">
										Sample
									</span>
								) : null}
							</h2>
							<p className="m-0 mt-2 text-muted">
								{[store.city, store.state].filter(Boolean).join(", ")}
								{store.zip ? ` ${store.zip}` : ""}
							</p>
							{store.directions ? (
								<a
									href={store.directions}
									target="_blank"
									rel="noreferrer"
									className="mt-3 inline-block text-underline"
								>
									Directions
								</a>
							) : null}
						</li>
					))}
				</ul>
			)}
			<p className="mt-10">
				Own a store?{" "}
				<a href="/wholesale/register" className="text-underline">
					Carry KuabCha
				</a>
				.
			</p>
		</Page>
	);
}
