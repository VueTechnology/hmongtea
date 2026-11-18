import { createFileRoute } from "@tanstack/react-router";
import { Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/logout")({
	head: () => ({ meta: [{ title: "Sign out | hmongtea.com" }] }),
	component: () => (
		<Page>
			<h1 className="font-serif text-4xl font-medium">Sign out</h1>
			<p>Use the sign out button on your account.</p>
		</Page>
	),
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postLogout } = await import("#/server/post.ts");
				return postLogout(request);
			},
		},
	},
});
