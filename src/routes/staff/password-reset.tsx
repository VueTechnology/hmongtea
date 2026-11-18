import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/password-reset")({
	loader: () => {
		throw redirect({ to: "/staff/customers" });
	},
	component: () => null,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}
