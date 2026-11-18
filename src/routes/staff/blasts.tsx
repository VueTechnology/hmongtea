import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffHome } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	Field,
	fieldClass,
	Notes,
	Page,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/blasts")({
	head: () => ({ meta: [{ title: "Blasts, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadStaffHome();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Blasts,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Blasts() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Email blast" />
			<Notes notes={notes} />
			<p>
				Customer mail goes to retail customers with a placed or shipped order
				who have not unsubscribed. Update mail goes to confirmed sign-ups who
				have not unsubscribed.
			</p>
			<form
				className="grid max-w-xl gap-4"
				method="post"
				action="/staff/blasts"
			>
				<Csrf />
				<label className="grid text-sm" htmlFor="audience">
					Audience
					<select
						id="audience"
						className={fieldClass}
						name="audience"
						defaultValue="preorder"
					>
						<option value="preorder">Customers with an order</option>
						<option value="updates">Update sign-ups</option>
					</select>
				</label>
				<Field label="Subject" name="subject" required />
				<label className="grid text-sm" htmlFor="body">
					Message
					<textarea
						id="body"
						className={fieldClass}
						name="body"
						rows={8}
						required
					/>
				</label>
				<button className={buttonClass} type="submit">
					Send blast
				</button>
			</form>
		</Page>
	);
}
