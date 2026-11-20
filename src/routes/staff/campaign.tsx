import { createFileRoute, redirect } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import { loadStaffCampaign } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, fieldClass, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/campaign")({
	head: () => ({ meta: [{ title: "Campaign, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadStaffCampaign();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Campaign,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Campaign() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Kickstarter placeholder" />
			<Notes notes={notes} />
			<p>
				Placeholder. These figures are sample numbers stored for the public
				page. They are not a live campaign. Saving keeps the placeholder mark.
			</p>
			<p>
				Current sample, {formatUsd(page.raisedCents)} of{" "}
				{formatUsd(page.targetCents)}.
			</p>
			<form
				className="grid max-w-sm gap-4"
				method="post"
				action="/staff/campaign"
			>
				<Csrf />
				<label className="grid text-sm" htmlFor="target">
					Target in whole dollars
					<input
						id="target"
						className={fieldClass}
						name="target"
						inputMode="numeric"
						defaultValue={String(Math.round(page.targetCents / 100))}
						required
					/>
				</label>
				<label className="grid text-sm" htmlFor="raised">
					Raised in whole dollars
					<input
						id="raised"
						className={fieldClass}
						name="raised"
						inputMode="numeric"
						defaultValue={String(Math.round(page.raisedCents / 100))}
						required
					/>
				</label>
				<button className={buttonClass} type="submit">
					Save placeholder
				</button>
			</form>
		</Page>
	);
}
