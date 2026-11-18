import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadSignups } from "#/fn.ts";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, fieldClass, Flash, Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/signups")({
	head: () => ({ meta: [{ title: "Sign-ups | hmongtea.com" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		...noteSearch(search),
		q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
	}),
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: async ({ deps }) => {
		const data = await loadSignups({ data: deps });
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: SignupsPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postSignups } = await import("#/server/post.ts");
				return postSignups(request);
			},
		},
	},
});

function SignupsPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Sign-ups</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Sign-ups</h1>
			<Flash code={search.error} saved={search.saved === "1"} />
			<form className="mt-4 flex gap-3" method="get">
				<input className={fieldClass} name="q" defaultValue={search.q} aria-label="Search sign-ups" />
				<button className={quietButtonClass} type="submit">
					Search
				</button>
			</form>
			<ul className="mt-6 grid gap-3">
				{data.signups.map((signup) => (
					<li key={signup.id} className="border border-line bg-paper p-4">
						<p className="m-0 break-all">
							{signup.email} · {signup.status}
						</p>
						<form className="mt-3 flex flex-wrap gap-3" method="post">
							<Csrf />
							<input type="hidden" name="id" value={signup.id} />
							<input className={fieldClass} name="name" defaultValue={signup.name} aria-label={`Name for ${signup.email}`} />
							<button className={quietButtonClass} name="intent" value="save" type="submit">
								Save
							</button>
							<button className={buttonClass} name="intent" value="delete" type="submit">
								Delete
							</button>
						</form>
					</li>
				))}
			</ul>
		</Page>
	);
}
