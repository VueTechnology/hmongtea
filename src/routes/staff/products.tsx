import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadStaffProduct } from "#/server/fns";
import { Forbidden } from "#/ui/gate";
import { noteSearch } from "#/ui/search";
import { buttonClass, Csrf, fieldClass, Notes, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/products")({
	head: () => ({ meta: [{ title: "Products, hmongtea.com staff" }] }),
	validateSearch: noteSearch,
	loader: async () => {
		const page = await loadStaffProduct();
		if (page.kind === "anonymous") throw redirect({ to: "/login" });
		return page;
	},
	component: Products,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Products() {
	const page = Route.useLoaderData();
	const notes = Route.useSearch();
	if (page.kind !== "ok") return <Forbidden />;
	const product = page.product;
	return (
		<Page>
			<Title eyebrow="Staff" title="Products" />
			<Notes notes={notes} />
			{product ? (
				<form
					className="grid max-w-sm gap-4"
					method="post"
					action="/staff/products"
				>
					<Csrf />
					<p className="m-0">
						{product.name}. SKU {product.sku}.
					</p>
					<label className="grid text-sm" htmlFor="on-hand">
						Packs on hand
						<input
							id="on-hand"
							className={fieldClass}
							name="onHand"
							type="number"
							min={0}
							max={1000000}
							defaultValue={product.onHand}
							required
						/>
					</label>
					<button className={buttonClass} type="submit">
						Save inventory
					</button>
				</form>
			) : (
				<p>The KuabCha pack is not in inventory.</p>
			)}
		</Page>
	);
}
