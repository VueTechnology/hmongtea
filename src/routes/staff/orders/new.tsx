import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffOrderForm } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	AddressFields,
	buttonClass,
	Csrf,
	Field,
	fieldClass,
	Notes,
	Page,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/orders/new")({
	head: () => ({
		meta: [{ title: "Order for an account, hmongtea.com staff" }],
	}),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadStaffOrderForm();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: OrderFor,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function OrderFor() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="Order for an account" />
			<Notes notes={notes} />
			<p className="max-w-xl">
				Customers pay the retail price. Partners pay their pricing tier. The
				order shows in that account's history and records you as the staff
				member who placed it.
			</p>
			<form
				className="grid max-w-xl gap-4"
				method="post"
				action="/staff/orders/new"
				data-testid="staff-order-for"
			>
				<Csrf />
				<label className="grid text-sm" htmlFor="accountId">
					Account
					<select
						id="accountId"
						className={fieldClass}
						name="accountId"
						required
					>
						<option value="">Choose an account</option>
						{page.targets.map((account) => (
							<option key={account.id} value={account.id}>
								{account.name} ({account.email}){" "}
								{account.side === "wholesale" ? "partner" : "customer"}
							</option>
						))}
					</select>
				</label>
				<Field label="Packs" name="qty" required defaultValue="1" />
				<Field
					label="Contact name"
					name="contactName"
					required
					autoComplete="name"
				/>
				<AddressFields />
				<button className={buttonClass} type="submit">
					Place order
				</button>
			</form>
		</Page>
	);
}
