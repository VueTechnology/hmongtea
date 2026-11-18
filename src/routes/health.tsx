import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
	server: {
		handlers: {
			GET: async () => {
				const { getHealth } = await import("#/server/post.ts");
				return getHealth();
			},
		},
	},
});
