import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadBlasts } from "#/fn.ts";
import { formatWhen } from "#/domain/money.ts";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, fieldClass, Flash, Notice, Page, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/blasts")({
	head: () => ({ meta: [{ title: "Email blasts | hmongtea.com" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const data = await loadBlasts();
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: BlastsPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postBlast } = await import("#/server/post.ts");
				return postBlast(request);
			},
		},
	},
});

function BlastsPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Blasts</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Email blasts</h1>
			<p className="max-w-2xl">Send one note to pre-order customers, or a separate note to confirmed update sign-ups. Unsubscribed addresses are skipped.</p>
			<Flash code={search.error} />
			{search.sent === "1" ? <Notice>The blast was recorded.</Notice> : null}
			<form className="mt-6 grid max-w-xl gap-4" method="post">
				<Csrf />
				<label className="text-sm">
					Audience
					<select className={fieldClass} name="audience" defaultValue="preorder" data-testid="blast-audience">
						<option value="preorder">Pre-order customers</option>
						<option value="updates">Update sign-ups</option>
					</select>
				</label>
				<label className="text-sm">
					Subject
					<input className={fieldClass} name="subject" required data-testid="blast-subject" />
				</label>
				<label className="text-sm">
					Message
					<textarea className={`${fieldClass} min-h-32`} name="body" required data-testid="blast-body" />
				</label>
				<button className={buttonClass} type="submit">
					Send blast
				</button>
			</form>
			<ul className="mt-8 grid gap-3">
				{data.blasts.map((blast) => (
					<li key={blast.id} className="border border-line bg-paper p-4">
						<p className="m-0 font-serif text-2xl">{blast.subject}</p>
						<p className="m-0 text-sm text-muted">
							{blast.audience} · {formatWhen(blast.createdAt)}
						</p>
					</li>
				))}
			</ul>
		</Page>
	);
}
