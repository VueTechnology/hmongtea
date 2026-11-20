import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/wholesale/register")({
	head: () => ({ meta: [{ title: "Partner application, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: WholesaleRegister,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function WholesaleRegister() {
	return (
		<Page>
			<Title eyebrow="Partners" title="Apply for an account" />
			<Notes notes={Route.useSearch()} />
			<p>
				The application stays pending until staff approve it or decline it. The
				tax ID is stored encrypted and shown masked on the partner account.
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
				Use 12 or more characters for the password. Enter the EIN as 9 digits.
			</p>
			<p>
				Already applied? <Link to="/login">Log in</Link>
			</p>
		</Page>
	);
}
