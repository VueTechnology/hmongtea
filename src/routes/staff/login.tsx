import { createFileRoute } from "@tanstack/react-router";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Field, Flash, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/login")({
	head: () => ({ meta: [{ title: "Staff sign in | hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: StaffLogin,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postStaffLogin } = await import("#/server/post.ts");
				return postStaffLogin(request);
			},
		},
	},
});

function StaffLogin() {
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Staff</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Staff sign in</h1>
			<Flash code={search.error} />
			<form className="mt-6 grid max-w-md gap-4" method="post" action="/staff/login">
				<Csrf />
				<Field id="staff-email" label="Email" name="email" type="email" required autoComplete="username" testId="staff-email" />
				<Field id="staff-password" label="Password" name="password" type="password" required autoComplete="current-password" testId="staff-password" />
				<button className={buttonClass} type="submit">
					Sign in
				</button>
			</form>
		</Page>
	);
}
