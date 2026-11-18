import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/reset")({
	head: () => ({ meta: [{ title: "Reset password, hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		...noteSearch(search),
		token: typeof search.token === "string" ? search.token.slice(0, 200) : "",
	}),
	component: Reset,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Reset() {
	const search = Route.useSearch();
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Choose a new password" />
			<Notes notes={search} />
			<form className="grid max-w-md gap-4" method="post" action="/reset">
				<Csrf />
				<input type="hidden" name="token" value={search.token} />
				<Field
					label="New password"
					name="password"
					type="password"
					required
					autoComplete="new-password"
				/>
				<p className="m-0 text-sm text-muted">Use 12 or more characters.</p>
				<button className={buttonClass} type="submit">
					Save password
				</button>
			</form>
			<p>
				<Link to="/login">Back to log in</Link>
			</p>
		</Page>
	);
}
