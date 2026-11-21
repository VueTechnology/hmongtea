import { createFileRoute } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import {
	NET_WEIGHT_LABEL,
	SHIP_WINDOW,
	SUBSCRIPTION_CENTS,
} from "#/domain/prices";
import { loadHome } from "#/server/fns";
import { BuyBox } from "#/ui/buy-box";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/")({
	head: () => ({ meta: [{ title: "hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: () => loadHome(),
	component: Home,
});

function Home() {
	const home = Route.useLoaderData();
	const notes = Route.useSearch();
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="KuabCha" />
			<Notes notes={notes} />
			<div className="grid items-start gap-8 md:grid-cols-2">
				<div className="grid gap-4">
					<p className="m-0 max-w-xl font-serif text-2xl italic leading-snug">
						Loose-leaf green tea from the Golden Triangle foothills in Chiang
						Rai, Thailand.
					</p>
					<p className="m-0">
						The pick is the top 3 leaves. Caffeine is low. Net weight{" "}
						{NET_WEIGHT_LABEL}. Ships in {SHIP_WINDOW}.
					</p>
					<p className="m-0">
						One pack is {formatUsd(home.retailCents)}. A subscription pack is{" "}
						{formatUsd(SUBSCRIPTION_CENTS)}.
					</p>
					<BuyBox id="home" />
				</div>
				<figure className="stage m-0">
					<picture>
						<source srcSet="/products/pack-box.webp" type="image/webp" />
						<img
							src="/products/pack-box.png"
							alt="KuabCha tea box, front and side"
							width={1152}
							height={1775}
						/>
					</picture>
				</figure>
			</div>
			<section className="mt-12 max-w-xl" aria-labelledby="updates-heading">
				<h2 id="updates-heading" className="font-serif text-3xl font-medium">
					Updates
				</h2>
				<p>
					Leave an email for updates. A name is optional. The request stays
					pending until you open the confirmation link.
				</p>
				<form className="grid gap-4" method="post" action="/updates">
					<Csrf />
					<Field
						label="Email"
						name="email"
						type="email"
						required
						autoComplete="email"
					/>
					<Field label="Name" name="name" autoComplete="name" />
					<button className={buttonClass} type="submit">
						Request updates
					</button>
				</form>
			</section>
		</Page>
	);
}
