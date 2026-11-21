import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadStaffWholesaleAccount } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	fieldClass,
	Notes,
	Page,
	quietButtonClass,
	Status,
	Title,
} from "#/ui/site";

export const Route = createFileRoute("/staff/wholesale/$accountId")({
	head: () => ({ meta: [{ title: "Partner account, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async ({ params }) => {
		const page = await loadStaffWholesaleAccount({ data: params.accountId });
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: WholesaleAccount,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function WholesaleAccount() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	const account = page.account;
	return (
		<Page>
			<Title eyebrow="Staff" title={account.legalName || "Partner account"} />
			<Notes notes={notes} />
			<dl className="grid gap-3 border border-line bg-paper p-4">
				<div>
					<dt className="text-sm text-muted">Status</dt>
					<dd className="m-0">
						<Status value={account.status} />
					</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Email</dt>
					<dd className="m-0">{account.email}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">DBA</dt>
					<dd className="m-0">{account.dba || "None"}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Address</dt>
					<dd className="m-0">{account.businessAddress}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Phone</dt>
					<dd className="m-0">{account.businessPhone}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Contact</dt>
					<dd className="m-0">{account.contactPerson}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Website</dt>
					<dd className="m-0">{account.website || "None"}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Resale certificate</dt>
					<dd className="m-0">{account.resaleCertificate || "None"}</dd>
				</div>
				<div>
					<dt className="text-sm text-muted">Tax ID</dt>
					<dd className="m-0" data-testid="tax-id">
						{account.taxId || account.taxMask}
					</dd>
				</div>
			</dl>
			<p>
				The tax ID is decrypted for staff on this page. Other pages show the
				mask.
			</p>
			<div className="mt-6 flex flex-wrap gap-3">
				{account.status !== "active" ? (
					<form method="post">
						<Csrf />
						<button
							className={buttonClass}
							name="action"
							value="approve"
							type="submit"
						>
							Approve
						</button>
					</form>
				) : null}
				{account.status !== "rejected" ? (
					<form method="post">
						<Csrf />
						<button
							className={quietButtonClass}
							name="action"
							value="reject"
							type="submit"
						>
							Decline
						</button>
					</form>
				) : null}
			</div>
			{account.status === "active" ? (
				<form className="mt-6 grid max-w-md gap-3" method="post">
					<Csrf />
					<label className="flex min-h-11 items-center gap-3 text-sm">
						<input
							type="checkbox"
							name="netTerms"
							value="1"
							defaultChecked={account.netTerms}
						/>
						Net terms placeholder
					</label>
					<p className="m-0 text-sm text-muted">
						Net terms is a placeholder flag. It does not open a credit line.
					</p>
					<button className={buttonClass} type="submit">
						Save flag
					</button>
				</form>
			) : null}
			{account.status === "active" ? (
				<form
					className="mt-6 grid max-w-md gap-3 border border-line bg-paper p-4"
					method="post"
				>
					<Csrf />
					<input type="hidden" name="action" value="store" />
					<h2 className="m-0 font-serif text-xl">Store listing</h2>
					<p className="m-0 text-sm text-muted">
						List this store on the public store page. Only the fields below are
						shown to buyers.
					</p>
					<label className="flex min-h-11 items-center gap-3 text-sm">
						<input
							type="checkbox"
							name="listed"
							value="1"
							defaultChecked={account.listedStore}
						/>
						Listed on the store page
					</label>
					<label className="grid text-sm" htmlFor="storeCity">
						City
						<input
							id="storeCity"
							name="storeCity"
							className={fieldClass}
							defaultValue={account.storeCity}
						/>
					</label>
					<label className="grid text-sm" htmlFor="storeState">
						State
						<input
							id="storeState"
							name="storeState"
							className={fieldClass}
							defaultValue={account.storeState}
						/>
					</label>
					<label className="grid text-sm" htmlFor="storeZip">
						ZIP
						<input
							id="storeZip"
							name="storeZip"
							className={fieldClass}
							defaultValue={account.storeZip}
						/>
					</label>
					<label className="grid text-sm" htmlFor="storeDirections">
						Directions link
						<input
							id="storeDirections"
							name="storeDirections"
							type="url"
							className={fieldClass}
							defaultValue={account.storeDirections}
							placeholder="https://maps.example.com/…"
						/>
					</label>
					<button className={buttonClass} type="submit">
						Save store listing
					</button>
				</form>
			) : null}
			<form className="mt-6" method="post" action="/staff/password-reset">
				<Csrf />
				<input type="hidden" name="email" value={account.email} />
				<input
					type="hidden"
					name="back"
					value={`/staff/wholesale/${account.id}`}
				/>
				<button className={quietButtonClass} type="submit">
					Send password reset
				</button>
			</form>
			<p>
				<Link to="/staff/wholesale">All partner accounts</Link>
			</p>
		</Page>
	);
}
