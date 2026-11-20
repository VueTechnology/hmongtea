import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffSignups } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	fieldClass,
	Notes,
	Page,
	quietButtonClass,
	Status,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/signups")({
	head: () => ({ meta: [{ title: "Sign-ups, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loaderDeps: ({ search }) => ({
		q: search.q ?? "",
		side: "",
		status: search.status ?? "",
	}),
	loader: async ({ deps }) => {
		const page = await loadStaffSignups({ data: deps });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Signups,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Signups() {
	const page = Route.useLoaderData();
	const search = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Update sign-ups" />
			<Notes notes={search} />
			<form
				className="flex flex-wrap items-end gap-3"
				method="get"
				action="/staff/signups"
			>
				<label className="grid text-sm" htmlFor="q">
					Search
					<input
						id="q"
						className={fieldClass}
						name="q"
						defaultValue={search.q ?? ""}
					/>
				</label>
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
						<option value="confirmed">Confirmed</option>
						<option value="unsubscribed">Unsubscribed</option>
					</select>
				</label>
				<button className={quietButtonClass} type="submit">
					Filter
				</button>
			</form>
			<ul className="mt-6 grid list-none gap-4 p-0">
				{page.signups.map((row) => (
					<li key={row.id} className="border border-line bg-paper p-4">
						<form
							className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end"
							method="post"
							action="/staff/signups"
						>
							<Csrf />
							<input type="hidden" name="id" value={row.id} />
							<label className="grid text-sm" htmlFor={`name-${row.id}`}>
								{row.email}
								<input
									id={`name-${row.id}`}
									className={fieldClass}
									name="name"
									defaultValue={row.name}
								/>
							</label>
							<label className="grid text-sm" htmlFor={`status-${row.id}`}>
								Status
								<select
									id={`status-${row.id}`}
									className={fieldClass}
									name="status"
									defaultValue={row.status}
								>
									<option value="pending">Pending</option>
									<option value="confirmed">Confirmed</option>
									<option value="unsubscribed">Unsubscribed</option>
								</select>
							</label>
							<button className={buttonClass} type="submit">
								Save
							</button>
							<button
								className={quietButtonClass}
								name="action"
								value="delete"
								type="submit"
							>
								Delete
							</button>
						</form>
						<p className="m-0 mt-2 text-sm text-muted">
							<Status value={row.status} />, {row.createdAt.slice(0, 10)}
						</p>
					</li>
				))}
			</ul>
		</Page>
	);
}
