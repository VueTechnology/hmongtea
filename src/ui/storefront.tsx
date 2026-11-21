import { BuyBox } from "#/ui/buy-box";
import { buttonClass, quietButtonClass } from "#/ui/site";

export function HomeHero() {
	return (
		<section className="section--dark" aria-labelledby="home-hero-title">
			<div className="wrap hero-grid">
				<div className="hero-intro">
					<p className="eyebrow">KuabCha whole-leaf green tea</p>
					<h1 className="display-heading" id="home-hero-title">
						Whole leaves. Nothing else.
					</h1>
				</div>
				<figure className="hero-media">
					<img
						src="/products/pack-box.webp"
						alt="KuabCha tea box, front and side"
						width={720}
						height={1109}
						loading="eager"
						fetchPriority="high"
					/>
				</figure>
				<div className="hero-lead">
					<p className="lead">From the hills of Chiang Rai, Thailand.</p>
					<p>Only the top three young leaves. Picked every day.</p>
				</div>
				<div className="hero-buy">
					<BuyBox id="home" />
				</div>
			</div>
		</section>
	);
}

export function UnfurlProof() {
	return (
		<section className="section" aria-labelledby="unfurl-title">
			<div className="wrap split-feature">
				<figure className="editorial-photo">
					<img
						src="/products/brew.jpg"
						alt="KuabCha green tea brewed in a glass pot and cup"
						width={2792}
						height={3316}
						loading="lazy"
						decoding="async"
					/>
				</figure>
				<div className="feature-copy">
					<p className="eyebrow">The proof is in the cup</p>
					<h2 className="section-heading" id="unfurl-title">
						Add hot water. Watch whole leaves open.
					</h2>
					<p className="lead">
						Rolled leaves open back into full leaves you can see.
					</p>
					<div className="placeholder-slot" data-placeholder="ugc">
						Customer unfurl videos go here.
					</div>
				</div>
			</div>
		</section>
	);
}

const benefits = [
	{
		title: "The top three leaves",
		body: "Each day, only the top three young leaves are picked from each tree. They are the most tender leaves on the plant.",
		image: "/products/field.jpg",
		alt: "Young tea leaves on a Chiang Rai hillside",
	},
	{
		title: "Forest-grown",
		body: "The tea grows among other plants and animals on the hillside.",
		image: "/products/field.jpg",
		alt: "Tea growing in rows among the forest",
	},
	{
		title: "Never burnt",
		body: "Made the natural way, so the leaf stays green.",
		image: "/products/brew.jpg",
		alt: "Green KuabCha tea in a cup",
	},
	{
		title: "One ingredient",
		body: "No blend and nothing added. Tea leaves, and that's it.",
		image: "/products/pack-bag.webp",
		alt: "A pack of KuabCha whole tea leaves",
	},
];

export function BenefitPillars() {
	return (
		<section className="section section--sage" aria-labelledby="benefits-title">
			<div className="wrap">
				<p className="eyebrow">From the hillside</p>
				<h2 className="section-heading" id="benefits-title">
					Only the leaf. Every detail matters.
				</h2>
				<div className="card-grid">
					{benefits.map((benefit) => (
						<article className="proof-card" key={benefit.title}>
							<img
								src={benefit.image}
								alt={benefit.alt}
								width={1200}
								height={900}
								loading="lazy"
								decoding="async"
							/>
							<div className="proof-card__body">
								<h3>{benefit.title}</h3>
								<p>{benefit.body}</p>
							</div>
						</article>
					))}
				</div>
				<ul className="chip-list" aria-label="More tea facts">
					<li>Whole leaves</li>
					<li>Low in caffeine</li>
					<li>Arrives fresh</li>
				</ul>
			</div>
		</section>
	);
}

export function OriginHeritage() {
	return (
		<section className="section section--dark" aria-labelledby="origin-title">
			<div className="wrap origin-grid">
				<figure className="editorial-photo origin-photo">
					<img
						src="/products/field.jpg"
						alt="Tea plants on the Golden Triangle foothills in Chiang Rai"
						width={1182}
						height={887}
						loading="lazy"
						decoding="async"
					/>
				</figure>
				<div className="feature-copy">
					<p className="eyebrow">Origin and Hmong heritage</p>
					<h2 className="section-heading" id="origin-title">
						Tea the way the hillside grows it.
					</h2>
					<p className="lead">
						KuabCha comes from the Golden Triangle foothills in Chiang Rai,
						Thailand, where it grows on the hills among the forest.
					</p>
					<p>Buy it here, or look for it at your local Hmong store.</p>
					<div className="story-slot">
						<img
							src="/products/pack-hero.webp"
							alt="Front of the KuabCha pack"
							width={387}
							height={600}
							loading="lazy"
							decoding="async"
						/>
						<p data-placeholder="story">
							The family story goes here. Pheng will confirm who grows the tea,
							how long they have made it, and what the name means.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

export function Comparison() {
	return (
		<section className="section" aria-labelledby="comparison-title">
			<div className="wrap">
				<p className="eyebrow">See what is in your cup</p>
				<h2 className="section-heading" id="comparison-title">
					One leaf. A clear difference.
				</h2>
				<table className="comparison-table" aria-label="KuabCha comparisons">
					<tbody>
						<tr className="comparison-row">
							<th scope="row">KuabCha</th>
							<td>Whole leaves you can watch open.</td>
						</tr>
						<tr className="comparison-row">
							<th scope="row">Most tea bags</th>
							<td>
								Small cut pieces, called fannings and dust in the trade, made to
								brew fast.
							</td>
						</tr>
						<tr className="comparison-row">
							<th scope="row">KuabCha</th>
							<td>One ingredient, the top three young leaves.</td>
						</tr>
						<tr className="comparison-row">
							<th scope="row">Blends</th>
							<td>Several teas or added flavors mixed together.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	);
}

const brewSteps = [
	{
		title: "Measure the leaves",
		body: "About a teaspoon of leaves for each cup.",
		image: "/products/pack-bag.webp",
		alt: "KuabCha whole tea leaves in their pack",
	},
	{
		title: "Add hot water",
		body: "Hot water, just off the boil. About 175 to 185°F (80 to 85°C).",
		image: "/products/brew.jpg",
		alt: "A glass pot of brewed green tea",
	},
	{
		title: "Watch and taste",
		body: "Steep 2 to 3 minutes, then taste. Watch the leaves open while you wait.",
		image: "/products/brew.jpg",
		alt: "A cup of KuabCha green tea",
	},
];

export function BrewGuide() {
	return (
		<section className="section section--sage" aria-labelledby="brew-title">
			<div className="wrap">
				<p className="eyebrow">A good place to start</p>
				<h2 className="section-heading" id="brew-title">
					A calm three-step ritual.
				</h2>
				<div className="ritual-grid">
					{brewSteps.map((step, index) => (
						<article className="proof-card" key={step.title}>
							<img
								src={step.image}
								alt={step.alt}
								width={1200}
								height={900}
								loading="lazy"
								decoding="async"
							/>
							<div className="proof-card__body">
								<p className="eyebrow">Step {index + 1}</p>
								<h3>{step.title}</h3>
								<p>{step.body}</p>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function SubscriptionPitch() {
	return (
		<section className="section" aria-labelledby="subscription-title">
			<div className="wrap subscription-panel">
				<div>
					<p className="eyebrow">Your next pack</p>
					<h2 className="section-heading" id="subscription-title">
						Never run out. Save $5.00 every pack.
					</h2>
				</div>
				<div className="feature-copy">
					<p className="lead">
						Subscribe for $39.94 a pack instead of $44.94, on a set schedule.
					</p>
					<p>Skip, change or cancel from your account.</p>
					<a className={buttonClass} href="#closing">
						Choose your plan
					</a>
				</div>
			</div>
		</section>
	);
}

export function LocalStoresSection() {
	return (
		<section
			className="section section--sage"
			aria-labelledby="stores-title"
			data-ht="local-stores"
		>
			<div className="wrap local-stores-panel">
				<div>
					<p className="eyebrow">Shop your way</p>
					<h2 className="section-heading" id="stores-title">
						Find KuabCha at your local Hmong store
					</h2>
				</div>
				<div className="feature-copy">
					<p className="lead">
						Rather shop in person? Look for KuabCha at your local Hmong store.
					</p>
					<a href="/stores" className={quietButtonClass}>
						Find a store
					</a>
				</div>
			</div>
		</section>
	);
}

export function ReviewSlots() {
	return (
		<section className="section" aria-labelledby="community-title">
			<div className="wrap">
				<p className="eyebrow">From the community</p>
				<h2 className="section-heading" id="community-title">
					What customers share
				</h2>
				<div className="card-grid">
					<div className="placeholder-slot" data-placeholder="reviews">
						Customer reviews go here. We will add real reviews when customers
						share them.
					</div>
					<div className="placeholder-slot" data-placeholder="ugc">
						Customer videos go here.
					</div>
				</div>
			</div>
		</section>
	);
}

const faqs = [
	[
		"What's in a pack?",
		"125 g (4.4 oz) of loose-leaf green tea. One ingredient: tea leaves.",
	],
	["Is it a blend?", "No. Just the leaf."],
	[
		"Does it have caffeine?",
		"Yes, a little. It is low in caffeine, and how strong you brew it changes the amount.",
	],
	[
		"Is green tea good for me?",
		"Green tea naturally contains catechins, a kind of antioxidant, and L-theanine, an amino acid. We don't make health claims about KuabCha.",
	],
	[
		"Where does it come from?",
		"The Golden Triangle foothills in Chiang Rai, Thailand.",
	],
	["When does it ship?", "Within 5 to 7 business days."],
	[
		"How does the subscription work?",
		"$39.94 a pack instead of $44.94, a fresh pack on a set schedule, and you can skip, change or cancel from your account.",
	],
	[
		"Can I buy it in a store?",
		"Look for it at your local Hmong store. See the store list.",
	],
	[
		"How do I store it?",
		"Keep the pack sealed, cool and away from light and moisture.",
	],
];

export function Faq() {
	return (
		<section className="section" aria-labelledby="faq-title">
			<div className="wrap faq-layout">
				<div>
					<p className="eyebrow">Good to know</p>
					<h2 className="section-heading" id="faq-title">
						Your questions, answered.
					</h2>
				</div>
				<div className="faq-list">
					{faqs.map(([question, answer]) => (
						<details key={question}>
							<summary>{question}</summary>
							<p>{answer}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

export function ClosingBuy({ id }: { id: string }) {
	return (
		<section
			className="section section--dark"
			id="closing"
			aria-labelledby={`${id}-closing-title`}
		>
			<div className="wrap closing-grid">
				<div className="feature-copy">
					<p className="eyebrow">KuabCha</p>
					<h2 className="section-heading" id={`${id}-closing-title`}>
						Whole leaves. Nothing else.
					</h2>
					<p className="lead">
						One ingredient, from the hills of Chiang Rai to your cup.
					</p>
				</div>
				<BuyBox id={`${id}-close`} sticky={false} />
			</div>
		</section>
	);
}

export function ProductGallery() {
	return (
		<div className="gallery">
			<div className="frame stage">
				<img
					className="shot-box"
					src="/products/pack-box.webp"
					alt="KuabCha tea box, front and side"
					width={720}
					height={1109}
					loading="lazy"
				/>
				<img
					className="shot-front"
					src="/products/pack-hero.webp"
					alt="Front of the KuabCha pack"
					width={387}
					height={600}
					loading="lazy"
				/>
				<img
					className="shot-back"
					src="/products/pack-back.webp"
					alt="Back of the KuabCha pack, with the net weight"
					width={390}
					height={600}
					loading="lazy"
				/>
				<img
					className="shot-side"
					src="/products/pack-side.webp"
					alt="Side of the KuabCha pack"
					width={355}
					height={600}
					loading="lazy"
				/>
			</div>
			<fieldset className="thumbs" aria-label="Product photos">
				<label htmlFor="shot-box">
					<input
						id="shot-box"
						type="radio"
						name="shot"
						defaultChecked
						aria-label="Box, front and side"
					/>
					<img src="/products/pack-box.webp" alt="" width={72} height={72} />
				</label>
				<label htmlFor="shot-front">
					<input
						id="shot-front"
						type="radio"
						name="shot"
						aria-label="Pack front"
					/>
					<img
						src="/products/pack-hero.webp"
						alt=""
						width={72}
						height={72}
						loading="lazy"
					/>
				</label>
				<label htmlFor="shot-back">
					<input
						id="shot-back"
						type="radio"
						name="shot"
						aria-label="Pack back"
					/>
					<img
						src="/products/pack-back.webp"
						alt=""
						width={72}
						height={72}
						loading="lazy"
					/>
				</label>
				<label htmlFor="shot-side">
					<input
						id="shot-side"
						type="radio"
						name="shot"
						aria-label="Pack side"
					/>
					<img
						src="/products/pack-side.webp"
						alt=""
						width={72}
						height={72}
						loading="lazy"
					/>
				</label>
			</fieldset>
		</div>
	);
}

export function ProductHero() {
	return (
		<section className="section" aria-labelledby="tea-title">
			<div className="wrap hero-grid">
				<div className="hero-intro">
					<p className="eyebrow">KuabCha whole-leaf green tea</p>
					<h1 className="display-heading" id="tea-title">
						Whole leaves. Nothing else.
					</h1>
				</div>
				<figure className="hero-media">
					<img
						src="/products/pack-box.webp"
						alt="KuabCha tea box, front and side"
						width={720}
						height={1109}
						fetchPriority="high"
					/>
				</figure>
				<div className="hero-lead">
					<p className="lead">
						From the Golden Triangle foothills in Chiang Rai, Thailand. One
						ingredient, nothing added.
					</p>
					<ul className="chip-list" aria-label="Tea facts">
						<li>Top three young leaves</li>
						<li>Low in caffeine</li>
						<li>125 g (4.4 oz)</li>
					</ul>
				</div>
				<div className="hero-buy">
					<BuyBox id="tea" />
				</div>
			</div>
		</section>
	);
}

export function ProductGallerySection() {
	return (
		<section className="section" aria-labelledby="gallery-title">
			<div className="wrap">
				<p className="eyebrow">The pack</p>
				<h2 className="section-heading" id="gallery-title">
					Every side of the leaf
				</h2>
				<ProductGallery />
			</div>
		</section>
	);
}
