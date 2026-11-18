import { createFileRoute } from "@tanstack/react-router";
import { loadUnsubscribe } from "#/server/fns";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/unsubscribe")({
	head: () => ({ meta: [{ title: "Unsubscribe, hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token.slice(0, 200) : "",
	}),
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: ({ deps }) => loadUnsubscribe({ data: deps.token }),
	component: Unsubscribe,
});

function Unsubscribe() {
	const page = Route.useLoaderData();
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Unsubscribe" />
			<p data-testid="unsubscribe-result">
				{page.result === "done"
					? "This email will not receive further updates."
					: "That unsubscribe link is not valid."}
			</p>
		</Page>
	);
}
