import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffWholesale } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import { fieldClass, Page, quietButtonClass, Status, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/wholesale/")({
	head: () => ({ meta: [{ title: "Partner accounts, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loaderDeps: ({ search }) => ({ status: search.status ?? "" }),
	loader: async ({ deps }) => {
		const page = await loadStaffWholesale({ data: deps.status });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: WholesaleList,
});

function WholesaleList() {
	const page = Route.useLoaderData();
	const search = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Partner accounts" />
			<form
				className="flex flex-wrap items-end gap-3"
				method="get"
				action="/staff/wholesale"
			>
				<label className="grid text-sm" htmlFor="status">
					Status
					<select
						id="status"
						className={fieldClass}
						name="status"
						defaultValue={search.status ?? ""}
					>
						<option value="">Any</option>
						<option value="pending">Pending</option>
						<option value="active">Approved</option>
						<option value="rejected">Rejected</option>
					</select>
				</label>
				<button className={quietButtonClass} type="submit">
					Filter
				</button>
			</form>
			<ul className="mt-6 grid list-none gap-3 p-0">
				{page.accounts.map((account) => (
					<li key={account.id} className="border border-line bg-paper p-4">
						<Link
							to="/staff/wholesale/$accountId"
							params={{ accountId: account.id }}
							className="font-serif text-2xl text-ink"
						>
							{account.legalName || account.email}
						</Link>
						<p className="m-0 mt-2 text-sm">
							<Status value={account.status} />, {account.email},{" "}
							{account.taxMask}
						</p>
					</li>
				))}
			</ul>
		</Page>
	);
}
