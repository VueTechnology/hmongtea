import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadAudit } from "#/fn.ts";
import { formatWhen } from "#/domain/money.ts";
import { Page, StaffNav } from "#/ui/site.tsx";

export const Route = createFileRoute("/staff/audit")({
	head: () => ({ meta: [{ title: "Audit log | hmongtea.com" }] }),
	loader: async () => {
		const data = await loadAudit();
		if (data.kind === "login") throw redirect({ to: "/staff/login" });
		return data;
	},
	component: AuditPage,
});

function AuditPage() {
	const data = Route.useLoaderData();
	if (data.kind !== "ok") {
		return (
			<Page>
				<h1 className="font-serif text-4xl">Audit log</h1>
				<p>Staff only.</p>
			</Page>
		);
	}
	return (
		<Page>
			<StaffNav />
			<h1 className="font-serif text-5xl font-medium">Audit log</h1>
			<ul className="mt-6 grid gap-3">
				{data.rows.map((row) => (
					<li key={row.id} className="border border-line bg-paper p-4 text-sm">
						<p className="m-0">
							{row.action} · {row.entity} · {row.entityId}
						</p>
						<p className="m-0 break-all text-muted">
							{formatWhen(row.createdAt)} · {row.detail}
						</p>
					</li>
				))}
			</ul>
		</Page>
	);
}
