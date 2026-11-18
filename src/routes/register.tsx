import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Field, Flash, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/register")({
	head: () => ({ meta: [{ title: "Create a retail account | hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: RegisterPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postRegister } = await import("#/server/post.ts");
				return postRegister(request);
			},
		},
	},
});

function RegisterPage() {
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Retail</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Create a retail account</h1>
			<Flash code={search.error} />
			<form className="mt-6 grid max-w-md gap-4" method="post" action="/register">
				<Csrf />
				<Field id="register-name" label="Name" name="name" required autoComplete="name" testId="register-name" />
				<Field id="register-email" label="Email" name="email" type="email" required autoComplete="email" testId="register-email" />
				<Field id="register-phone" label="Phone" name="phone" autoComplete="tel" />
				<Field id="register-password" label="Password" name="password" type="password" required autoComplete="new-password" testId="register-password" />
				<button className={buttonClass} type="submit">
					Create account
				</button>
			</form>
			<p className="mt-6 text-sm">
				Wholesale buyers <Link to="/wholesale/register">apply here</Link>.
			</p>
		</Page>
	);
}
