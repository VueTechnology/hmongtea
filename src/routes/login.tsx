import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSearch } from "#/search.ts";
import { buttonClass, Csrf, Eyebrow, Field, Flash, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Sign in | hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: LoginPage,
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postLogin } = await import("#/server/post.ts");
				return postLogin(request);
			},
		},
	},
});

function LoginPage() {
	const search = Route.useSearch();
	return (
		<Page>
			<Eyebrow>Account</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Sign in</h1>
			<p className="max-w-xl">Retail and wholesale accounts use this form.</p>
			<Flash code={search.error} />
			<form className="mt-6 grid max-w-md gap-4" method="post" action="/login">
				<Csrf />
				<Field id="login-email" label="Email" name="email" type="email" required autoComplete="username" testId="login-email" />
				<Field id="login-password" label="Password" name="password" type="password" required autoComplete="current-password" testId="login-password" />
				<button className={buttonClass} type="submit">
					Sign in
				</button>
			</form>
			<p className="mt-6 text-sm">
				<Link to="/register">Create a retail account</Link>
			</p>
		</Page>
	);
}
