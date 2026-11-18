import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { postStripe } = await import("#/server/post.ts");
				return postStripe(request);
			},
		},
	},
});
