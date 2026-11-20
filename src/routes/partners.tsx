import { createFileRoute, Link } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import { MOQ, WHOLESALE_TIERS } from "#/domain/prices";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/partners")({
	head: () => ({ meta: [{ title: "Partners, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: Partners,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Partners() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Partners" />
			<Notes notes={Route.useSearch()} />
			<p className="max-w-2xl">
				Shops and distributors can carry KuabCha. hmongtea.com packs the tea in
				Chiang Rai and ships it to the address on the application. A partner
				account orders in bulk after staff approve the application.
			</p>
			<ul className="grid list-none gap-2 p-0" data-testid="partner-tiers">
				{WHOLESALE_TIERS.map((tier) => (
					<li key={tier.minQty}>
						{tier.label}, {formatUsd(tier.unitCents)} each.
					</li>
				))}
			</ul>
			<p>The first order is {MOQ} packs. Smaller orders use the shop price.</p>
			<h2 id="apply">Apply</h2>
			<p>
				The application stays pending until staff approve it or decline it. An
				approved account can log in and order. The tax ID is stored encrypted.
			</p>
			<form
				className="grid max-w-lg gap-4"
				method="post"
				action="/wholesale/register"
			>
				<Csrf />
				<Field
					label="Email"
					name="email"
					type="email"
					required
					autoComplete="email"
				/>
				<Field
					label="Password"
					name="password"
					type="password"
					required
					autoComplete="new-password"
				/>
				<Field label="Legal business name" name="legalName" required />
				<Field label="DBA" name="dba" />
				<Field label="Business address" name="businessAddress" required />
				<Field
					label="Business phone"
					name="businessPhone"
					required
					autoComplete="tel"
				/>
				<Field
					label="Contact person"
					name="contactPerson"
					required
					autoComplete="name"
				/>
				<Field label="Website" name="website" />
				<Field
					label="Reseller or resale certificate number"
					name="resaleCertificate"
				/>
				<Field label="Tax ID, EIN" name="ein" required autoComplete="off" />
				<button className={buttonClass} type="submit">
					Submit application
				</button>
			</form>
			<p>
				Use 12 or more characters. Already approved?{" "}
				<Link to="/login">Log in</Link>
			</p>
		</Page>
	);
}
