import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/forgot")({
	head: () => ({ meta: [{ title: "Forgot password, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: Forgot,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Forgot() {
	const notes = Route.useSearch();
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Forgot password" />
			<Notes notes={notes} />
			<form className="grid max-w-md gap-4" method="post" action="/forgot">
				<Csrf />
				<Field
					label="Email"
					name="email"
					type="email"
					required
					autoComplete="email"
				/>
				<button className={buttonClass} type="submit">
					Send reset link
				</button>
			</form>
			<p>
				<Link to="/login">Back to log in</Link>
			</p>
		</Page>
	);
}
