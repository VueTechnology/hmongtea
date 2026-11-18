import { createFileRoute } from "@tanstack/react-router";
import { loadConfirm } from "#/fn.ts";
import { Eyebrow, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/updates_/confirm")({
	head: () => ({ meta: [{ title: "Confirm updates | hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === "string" ? search.token.slice(0, 80) : "" }),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadConfirm({ data: deps }),
	component: ConfirmPage,
});

function ConfirmPage() {
	const data = Route.useLoaderData();
	return (
		<Page>
			<Eyebrow>Updates</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Confirm</h1>
			{data.result === "confirmed" ? <p data-testid="confirmed">Your email is confirmed.</p> : <p>This link is not valid.</p>}
		</Page>
	);
}
