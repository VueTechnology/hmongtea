import { createFileRoute } from "@tanstack/react-router";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Field, Flash, Notice, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/updates")({
	head: () => ({ meta: [{ title: "Updates | hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: UpdatesPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postUpdates } = await import("#/server/post.ts");
				return postUpdates(request);
			},
		},
	},
});

function UpdatesPage() {
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Notes</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Updates</h1>
			<div className="my-6 h-px w-16 bg-gold" aria-hidden="true" />
			<p className="max-w-2xl">Leave an email for notes from hmongtea.com. Confirm the address before a note is sent. Each note includes an unsubscribe link.</p>
			<Flash code={search.error} />
			{search.sent === "1" ? <Notice>Check your email and confirm the address.</Notice> : null}
			{search.sent === "1" ? null : (
				<form className="mt-6 grid max-w-md gap-4" method="post" action="/updates">
					<Csrf />
					<Field id="updates-email" label="Email" name="email" type="email" required autoComplete="email" testId="updates-email" />
					<Field id="updates-name" label="Name, optional" name="name" autoComplete="name" testId="updates-name" />
					<button className={buttonClass} type="submit">
						Send the confirmation
					</button>
				</form>
			)}
		</Page>
	);
}
