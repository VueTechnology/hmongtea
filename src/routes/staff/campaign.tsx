import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadCampaign } from "#/fn.ts";
import { formatUsd } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Field, Flash, Page, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/campaign")({
	head: () => ({ meta: [{ title: "Campaign placeholder | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const data = await loadCampaign();
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: CampaignPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postCampaign } = await import("#/server/post.ts");
				return postCampaign(request);
			},
		},
	},
});

function CampaignPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Campaign</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Campaign placeholder</h1>
			<p data-testid="campaign-placeholder">Placeholder. Not a live Kickstarter total. The label on the row stays placeholder.</p>
			<p>
				Now showing {formatUsd(data.raisedCents)} of {formatUsd(data.targetCents)}.
			</p>
			<Flash code={search.error} saved={search.saved === "1"} />
			<form className="mt-6 grid max-w-md gap-4" method="post">
				<Csrf />
				<Field id="target" label="Target in dollars" name="target" required defaultValue={(data.targetCents / 100).toFixed(2)} testId="campaign-target" />
				<Field id="raised" label="Raised in dollars" name="raised" required defaultValue={(data.raisedCents / 100).toFixed(2)} testId="campaign-raised" />
				<button className={buttonClass} type="submit">
					Save placeholder
				</button>
			</form>
		</Page>
	);
}
