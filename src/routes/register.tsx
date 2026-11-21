import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/register")({
	head: () => ({ meta: [{ title: "Register, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: Register,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Register() {
	const notes = Route.useSearch();
	return (
		<Page>
			<Title eyebrow="Retail" title="Create an account" />
			<Notes notes={notes} />
			<form className="grid max-w-md gap-4" method="post" action="/register">
				<Csrf />
				{notes.order ? (
					<input type="hidden" name="order" value={notes.order} />
				) : null}
				{notes.claim ? (
					<input type="hidden" name="claim" value={notes.claim} />
				) : null}
				<Field label="Name" name="name" required autoComplete="name" />
				<Field
					label="Email"
					name="email"
					type="email"
					required
					autoComplete="email"
				/>
				<Field label="Phone" name="phone" autoComplete="tel" />
				<Field
					label="Password"
					name="password"
					type="password"
					required
					autoComplete="new-password"
				/>
				<button className={buttonClass} type="submit">
					Create account
				</button>
			</form>
			<p>Use 12 or more characters for the password.</p>
			<p>
				Already registered? <Link to="/login">Log in</Link>
			</p>
		</Page>
	);
}
