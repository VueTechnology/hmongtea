import { createFileRoute } from "@tanstack/react-router";
import { noteSearch } from "#/search.ts";
import { AddressFields, buttonClass, Csrf, Eyebrow, Field, Flash, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/wholesale_/register")({
	head: () => ({ meta: [{ title: "Wholesale application | hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: WholesaleRegister,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postWholesaleRegister } = await import("#/server/post.ts");
				return postWholesaleRegister(request);
			},
		},
	},
});

function WholesaleRegister() {
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Wholesale</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Wholesale application</h1>
			<p className="max-w-2xl">The account stays pending until staff approve it. The tax ID is stored encrypted and shown masked on the account.</p>
			<Flash code={search.error} />
			<form className="mt-6 grid max-w-xl gap-4" method="post" action="/wholesale/register">
				<Csrf />
				<Field id="ws-legal" label="Legal business name" name="legal_name" required testId="legal-name" />
				<Field id="ws-dba" label="DBA" name="dba" required testId="dba" />
				<AddressFields prefix="ws" />
				<Field id="ws-phone" label="Phone" name="phone" required autoComplete="tel" testId="ws-phone" />
				<Field id="ws-contact" label="Contact person" name="contact_person" required testId="contact-person" />
				<Field id="ws-web" label="Website, optional" name="website" />
				<Field id="ws-cert" label="Reseller or resale certificate number, optional" name="reseller_certificate" />
				<Field id="ws-tax" label="Tax ID" name="tax_id" required testId="tax-id" />
				<Field id="ws-email" label="Email" name="email" type="email" required autoComplete="email" testId="ws-email" />
				<Field id="ws-password" label="Password" name="password" type="password" required autoComplete="new-password" testId="ws-password" />
				<button className={buttonClass} type="submit">
					Submit application
				</button>
			</form>
		</Page>
	);
}
