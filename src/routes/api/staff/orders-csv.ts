import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/orders-csv")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { handleExport } = await import("#/server/actions");
				return handleExport(request);
			},
		},
	},
});
