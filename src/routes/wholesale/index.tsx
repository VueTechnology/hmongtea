import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wholesale/")({
	beforeLoad: () => {
		throw redirect({ to: "/partners" });
	},
});
