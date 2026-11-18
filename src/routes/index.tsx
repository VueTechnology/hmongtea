import { createFileRoute, Link } from "@tanstack/react-router";
import { loadHome } from "#/fn.ts";
import { formatUsd, percent } from "#/domain/money.ts";
import { Eyebrow, Page, quietButtonClass } from "#/ui/site.tsx";

export const Route = createFileRoute("/")({
	head: () => ({ meta: [{ title: "hmongtea.com" }] }),
	loader: () => loadHome(),
	component: Home,
});

function Home() {
	const campaign = Route.useLoaderData();
	const width = percent(campaign.raisedCents, campaign.targetCents);
	return (
		<Page>
			<Eyebrow>Loose leaf</Eyebrow>
			<h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight font-medium md:text-6xl">hmongtea.com</h1>
			<div className="my-6 h-px w-16 bg-gold" aria-hidden="true" />
			<p className="max-w-2xl font-serif text-2xl italic leading-snug md:text-3xl">KuabCha loose-leaf green tea.</p>
			<div className="mt-8 grid items-start gap-8 md:grid-cols-2">
				<div className="grid gap-4 text-lg">
					<p className="m-0">KuabCha is loose-leaf green tea from the Golden Triangle foothills in Chiang Rai, Thailand. The pick is the top three leaves. The tea is low in caffeine.</p>
					<p className="m-0">Pre-order a pack, or leave an email for updates from hmongtea.com.</p>
					<div className="flex flex-wrap gap-3 pt-2">
						<Link to="/tea" className={quietButtonClass}>
							See the tea
						</Link>
						<Link to="/updates" className={quietButtonClass}>
							Get updates
						</Link>
					</div>
				</div>
				<figure className="m-0 border border-line bg-paper p-3">
					<img src="/products/pack.jpg" alt="KuabCha loose-leaf green tea pack" />
					<figcaption className="mt-3 font-serif text-2xl">KuabCha</figcaption>
				</figure>
			</div>
			<section className="mt-14 max-w-md border border-line bg-paper px-4 py-4" aria-label="Campaign placeholder" data-testid="campaign">
				<p className="m-0 text-xs tracking-[0.18em] text-muted uppercase">Campaign placeholder</p>
				<p className="m-0 mt-2 text-sm">Sample figures for a first run. These amounts are placeholders.</p>
				<div
					className="mt-3 h-2 bg-line"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={campaign.targetCents}
					aria-valuenow={campaign.raisedCents}
					data-testid="kickstarter-bar"
				>
					<div className="h-2 bg-gold" style={{ width: `${width}%` }} />
				</div>
				<p className="m-0 mt-2 text-sm text-muted" data-testid="kickstarter-figures">
					{formatUsd(campaign.raisedCents)} raised of {formatUsd(campaign.targetCents)}
				</p>
			</section>
		</Page>
	);
}
