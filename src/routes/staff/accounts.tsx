import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffAccountForm } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	Field,
	fieldClass,
	Notes,
	Page,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/accounts")({
	head: () => ({ meta: [{ title: "New account, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadStaffAccountForm();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: NewAccount,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function NewAccount() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	return (
		<Page>
			<Title eyebrow="Staff" title="New account" />
			<Notes notes={notes} />
			<form
				className="grid max-w-md gap-4"
				method="post"
				action="/staff/accounts"
				data-testid="staff-create-account"
			>
				<Csrf />
				<Field label="Name" name="name" required autoComplete="name" />
				<Field
					label="Email"
					name="email"
					type="email"
					required
					autoComplete="email"
				/>
				<Field label="Phone" name="phone" required autoComplete="tel" />
				<label className="grid text-sm" htmlFor="role">
					Role
					<select
						id="role"
						className={fieldClass}
						name="role"
						required
						defaultValue="customer"
					>
						<option value="customer">Customer</option>
						<option value="partner">Partner</option>
					</select>
				</label>
				<Field label="Company" name="company" autoComplete="organization" />
				<label className="grid text-sm" htmlFor="tier">
					Pricing tier
					<select id="tier" className={fieldClass} name="tier" defaultValue="">
						<option value="">None</option>
						{page.tiers.map((tier) => (
							<option key={tier.id} value={tier.id}>
								{tier.label}
							</option>
						))}
					</select>
				</label>
				<Field
					label="Password"
					name="password"
					type="password"
					autoComplete="new-password"
				/>
				<label className="flex min-h-11 items-center gap-3 text-sm">
					<input type="checkbox" name="sendPassword" value="1" />
					Send a set-password email instead
				</label>
				<p className="m-0 text-sm text-muted">
					Partners need a company and a pricing tier. A password needs 12 or
					more characters unless you send the set-password email.
				</p>
				<button className={buttonClass} type="submit">
					Create account
				</button>
			</form>
		</Page>
	);
}
