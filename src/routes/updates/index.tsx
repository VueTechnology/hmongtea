import { createFileRoute } from "@tanstack/react-router";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, Field, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/updates/")({
	head: () => ({ meta: [{ title: "Updates, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: Updates,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Updates() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Updates" />
			<Notes notes={Route.useSearch()} />
			<p>
				Leave an email for updates. A name is optional. Open the confirmation
				link before the list includes you.
			</p>
			<form className="grid max-w-md gap-4" method="post" action="/updates">
				<Csrf />
				<Field
					label="Email"
					name="email"
					type="email"
					required
					autoComplete="email"
				/>
				<Field label="Name" name="name" autoComplete="name" />
				<button className={buttonClass} type="submit">
					Request updates
				</button>
			</form>
		</Page>
	);
}
