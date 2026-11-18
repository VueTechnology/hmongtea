import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/export_/download")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { getExport } = await import("#/server/post.ts");
				return getExport(request);
			},
		},
	},
});
