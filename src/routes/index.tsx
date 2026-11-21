import { createFileRoute } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { Notes } from "#/ui/site";
import {
	BenefitPillars,
	BrewGuide,
	ClosingBuy,
	Comparison,
	Faq,
	HomeHero,
	LocalStoresSection,
	OriginHeritage,
	ReviewSlots,
	SubscriptionPitch,
	UnfurlProof,
} from "#/ui/storefront";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "KuabCha whole-leaf green tea | HmongTea" },
			{
				name: "description",
				content:
					"Whole-leaf green tea from the hills of Chiang Rai. One ingredient, the top three young leaves. Buy one pack or subscribe and save $5.00.",
			},
		],
	}),
	validateSearch: noteSearch,
	component: Home,
});

function Home() {
	return (
		<main id="main" className="storefront-main">
			<HomeHero />
			<Notes notes={Route.useSearch()} />
			<UnfurlProof />
			<BenefitPillars />
			<OriginHeritage />
			<Comparison />
			<BrewGuide />
			<SubscriptionPitch />
			<LocalStoresSection />
			<ReviewSlots />
			<Faq />
			<ClosingBuy id="home" />
		</main>
	);
}
