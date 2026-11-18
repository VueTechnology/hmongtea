import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffHome } from "#/fn.ts";
import { Page, quietButtonClass, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/export")({
	head: () => ({ meta: [{ title: "Export | hmongtea.com" }] }),
	loader: async () => {
		const data = await loadStaffHome();
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: ExportPage,
});

function ExportPage() {
	const data = Route.useLoaderData();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl font-medium">Export</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-4xl font-medium">Export</h1>
			<p>Download the pre-order list as CSV.</p>
			<a className={quietButtonClass} href="/staff/export/download">
				Download CSV
			</a>
		</Page>
	);
}
