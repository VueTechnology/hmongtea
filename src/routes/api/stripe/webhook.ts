import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { handleWebhook } = await import("#/server/actions");
				return handleWebhook(request);
			},
		},
	},
});
