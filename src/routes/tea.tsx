import { createFileRoute } from "@tanstack/react-router";
import { NET_WEIGHT_LABEL, PRODUCT_NAME, SHIP_WINDOW } from "#/domain/prices";
import { BuyBox } from "#/ui/buy-box";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/tea")({
	head: () => ({ meta: [{ title: "Tea, hmongtea.com" }] }),
	component: Tea,
});

function Tea() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title={PRODUCT_NAME} />
			<div className="grid items-start gap-8 md:grid-cols-2">
				<div className="gallery">
					<div className="frame stage">
						<picture>
							<source srcSet="/products/pack-box.webp" type="image/webp" />
							<img
								className="shot-box"
								src="/products/pack-box.png"
								alt="KuabCha tea box, front and side"
								width={1152}
								height={1775}
							/>
						</picture>
						<picture>
							<source srcSet="/products/pack-hero.webp" type="image/webp" />
							<img
								className="shot-front"
								src="/products/pack-hero.png"
								alt="Front of the KuabCha pack"
								width={387}
								height={600}
							/>
						</picture>
						<picture>
							<source srcSet="/products/pack-back.webp" type="image/webp" />
							<img
								className="shot-back"
								src="/products/pack-back.png"
								alt="Back of the KuabCha pack, with the net weight"
								width={390}
								height={600}
							/>
						</picture>
						<picture>
							<source srcSet="/products/pack-side.webp" type="image/webp" />
							<img
								className="shot-side"
								src="/products/pack-side.png"
								alt="Side of the KuabCha pack"
								width={355}
								height={600}
							/>
						</picture>
					</div>
					<div className="thumbs">
						<label htmlFor="shot-box">
							<input id="shot-box" type="radio" name="shot" defaultChecked />
							<img
								src="/products/pack-box.webp"
								alt=""
								width={72}
								height={72}
							/>
						</label>
						<label htmlFor="shot-front">
							<input id="shot-front" type="radio" name="shot" />
							<img
								src="/products/pack-hero.webp"
								alt=""
								width={72}
								height={72}
							/>
						</label>
						<label htmlFor="shot-back">
							<input id="shot-back" type="radio" name="shot" />
							<img
								src="/products/pack-back.webp"
								alt=""
								width={72}
								height={72}
							/>
						</label>
						<label htmlFor="shot-side">
							<input id="shot-side" type="radio" name="shot" />
							<img
								src="/products/pack-side.webp"
								alt=""
								width={72}
								height={72}
							/>
						</label>
					</div>
				</div>
				<div className="grid gap-4">
					<p className="max-w-2xl">
						KuabCha is loose-leaf green tea from the Golden Triangle foothills
						in Chiang Rai, Thailand. The pick is the top 3 leaves. Caffeine is
						low. Net weight {NET_WEIGHT_LABEL}. Ships in {SHIP_WINDOW}.
					</p>
					<BuyBox id="tea" />
				</div>
			</div>
		</Page>
	);
}
