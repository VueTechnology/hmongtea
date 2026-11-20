import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pre-order")({
	beforeLoad: () => {
		throw redirect({ to: "/tea" });
	},
});
