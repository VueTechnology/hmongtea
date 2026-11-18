import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadPeople } from "#/fn.ts";
import { noteSearch } from "#/search.ts";
import { Csrf, fieldClass, Flash, Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/accounts")({
	head: () => ({ meta: [{ title: "Accounts | hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		...noteSearch(search),
		q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
		side: typeof search.side === "string" ? search.side : "",
		status: typeof search.status === "string" ? search.status : "",
	}),
	loaderDeps: ({ search }) => ({ q: search.q, side: search.side, status: search.status }),
	loader: async ({ deps }) => {
		const data = await loadPeople({ data: deps });
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: AccountsPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postPeople } = await import("#/server/post.ts");
				return postPeople(request);
			},
		},
	},
});

function AccountsPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Accounts</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Accounts</h1>
			<Flash code={search.error} saved={search.saved === "1"} />
			<form className="mt-4 flex flex-wrap gap-3" method="get">
				<input className={fieldClass} name="q" defaultValue={search.q} aria-label="Search accounts" />
				<select className={fieldClass} name="side" defaultValue={search.side} aria-label="Side">
					<option value="">Any side</option>
					<option value="retail">Retail</option>
					<option value="wholesale">Wholesale</option>
				</select>
				<select className={fieldClass} name="status" defaultValue={search.status} aria-label="Status">
					<option value="">Any status</option>
					<option value="active">Active</option>
					<option value="pending">Pending</option>
					<option value="rejected">Rejected</option>
				</select>
				<button className={quietButtonClass} type="submit">
					Filter
				</button>
			</form>
			<ul className="mt-6 grid gap-3">
				{data.people.map((person) => (
					<li key={person.id} className="border border-line bg-paper p-4" data-testid="account-row">
						<p className="m-0 break-all">
							{person.email} · {person.role} · {person.accountType ?? "staff"} · {person.status}
						</p>
						{person.legalName ? <p className="m-0">{person.legalName}</p> : null}
						{person.taxFull ? <p className="m-0" data-testid="tax-full">Tax ID {person.taxFull}</p> : null}
						{person.accountType === "wholesale" ? (
							<form className="mt-3 flex flex-wrap gap-2" method="post">
								<Csrf />
								<input type="hidden" name="id" value={person.id} />
								{person.status === "pending" ? (
									<button className={quietButtonClass} name="intent" value="approve" type="submit">
										Approve
									</button>
								) : null}
								{person.status !== "rejected" ? (
									<button className={quietButtonClass} name="intent" value="reject" type="submit">
										Reject
									</button>
								) : (
									<button className={quietButtonClass} name="intent" value="delete" type="submit">
										Delete
									</button>
								)}
								<input type="hidden" name="net_terms" value={person.netTerms ? "0" : "1"} />
								<button className={quietButtonClass} name="intent" value="net" type="submit">
									{person.netTerms ? "Clear net terms placeholder" : "Set net terms placeholder"}
								</button>
							</form>
						) : null}
					</li>
				))}
			</ul>
		</Page>
	);
}
