import { createFileRoute } from "@tanstack/react-router";
import { loadConfirm } from "#/server/fns";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/updates/confirm")({
	head: () => ({ meta: [{ title: "Confirm updates, hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token.slice(0, 200) : "",
	}),
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: ({ deps }) => loadConfirm({ data: deps.token }),
	component: Confirm,
});

function Confirm() {
	const page = Route.useLoaderData();
	const copy =
		page.result === "confirmed"
			? "The email is confirmed for updates."
			: page.result === "unsubscribed"
				? "This email is unsubscribed."
				: "That confirmation link is not valid.";
	return (
		<Page>
			<Title eyebrow="Updates" title="Confirmation" />
			<p data-testid="confirm-result">{copy}</p>
		</Page>
	);
}
