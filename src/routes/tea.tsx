import { createFileRoute } from "@tanstack/react-router";
import {
	BenefitPillars,
	BrewGuide,
	ClosingBuy,
	Comparison,
	Faq,
	ProductGallerySection,
	ProductHero,
	UnfurlProof,
} from "#/ui/storefront";

export const Route = createFileRoute("/tea")({
	head: () => ({
		meta: [
			{ title: "KuabCha whole-leaf green tea | HmongTea" },
			{
				name: "description",
				content:
					"Choose one pack of KuabCha for $44.94 or subscribe for $39.94 a pack. Whole-leaf green tea from Chiang Rai, Thailand.",
			},
		],
		links: [
			{
				rel: "preload",
				as: "image",
				href: "/products/pack-box.webp",
				fetchPriority: "high",
			},
		],
	}),
	component: Tea,
});

function Tea() {
	return (
		<main id="main" className="storefront-main">
			<ProductHero />
			<ProductGallerySection />
			<UnfurlProof />
			<BenefitPillars />
			<Comparison />
			<BrewGuide />
			<Faq />
			<ClosingBuy id="tea" />
		</main>
	);
}
