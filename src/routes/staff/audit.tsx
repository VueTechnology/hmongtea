import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffAudit } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/audit")({
	head: () => ({ meta: [{ title: "Audit, hmongtea.com staff" }] }),
	loader: async () => {
		const page = await loadStaffAudit();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Audit,
});

function Audit() {
	const page = Route.useLoaderData();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Audit log" />
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left text-sm">
					<thead>
						<tr className="border-b border-line">
							<th className="py-2 pr-3 font-medium">When</th>
							<th className="py-2 pr-3 font-medium">Action</th>
							<th className="py-2 pr-3 font-medium">Subject</th>
							<th className="py-2 pr-3 font-medium">Detail</th>
						</tr>
					</thead>
					<tbody>
						{page.entries.map((entry) => (
							<tr key={entry.id} className="border-b border-line">
								<td className="py-2 pr-3">
									{entry.createdAt.slice(0, 16).replace("T", " ")}
								</td>
								<td className="py-2 pr-3">{entry.action}</td>
								<td className="py-2 pr-3">
									{entry.subjectType} {entry.subjectId}
								</td>
								<td className="py-2 pr-3">{entry.detail}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Page>
	);
}
