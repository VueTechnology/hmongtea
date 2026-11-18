import { createFileRoute } from "@tanstack/react-router";
import { loadUnsubscribe } from "#/fn.ts";
import { Eyebrow, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/updates_/unsubscribe")({
	head: () => ({ meta: [{ title: "Unsubscribe | hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === "string" ? search.token.slice(0, 80) : "" }),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadUnsubscribe({ data: deps }),
	component: UnsubscribePage,
});

function UnsubscribePage() {
	const data = Route.useLoaderData();
	return (
		<Page>
			<Eyebrow>Updates</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Unsubscribe</h1>
			{data.result === "done" ? <p data-testid="unsubscribed">You are unsubscribed.</p> : <p>This link is not valid.</p>}
		</Page>
	);
}
