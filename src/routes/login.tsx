import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Log in, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: Login,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Login() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Log in" />
			<Notes notes={Route.useSearch()} />
			<form className="grid max-w-md gap-4" method="post" action="/login">
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
					autoComplete="current-password"
				/>
				<button className={buttonClass} type="submit">
					Log in
				</button>
			</form>
			<p>
				New account? <Link to="/register">Register</Link>
			</p>
		</Page>
	);
}
