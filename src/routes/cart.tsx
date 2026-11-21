import { createFileRoute, Link } from "@tanstack/react-router";
import { formatUsd } from "#/domain/money";
import {
	planUnitCents,
	RETAIL_CENTS,
	SUBSCRIPTION_CENTS,
} from "#/domain/prices";
import { noteSearch } from "#/ui/search";
import {
	buttonClass,
	Csrf,
	fieldClass,
	Notes,
	Page,
	quietButtonClass,
	Title,
	useShell,
} from "#/ui/site";

export const Route = createFileRoute("/cart")({
	head: () => ({ meta: [{ title: "Cart, hmongtea.com" }] }),
	validateSearch: noteSearch,
	component: CartPage,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function CartPage() {
	const notes = Route.useSearch();
	const shell = useShell();
	const qty = shell.cartQty;
	const unitCents = planUnitCents(shell.cartPlanKind);
	const total = qty * unitCents;
	return (
		<Page>
			<Title eyebrow="Retail" title="Cart" />
			<Notes notes={notes} />
			{qty < 1 ? (
				<div className="grid max-w-md gap-4 border border-line bg-paper p-6">
					<img
						src="/products/pack-hero.webp"
						alt="Front of the KuabCha pack"
						width={387}
						height={600}
						className="mx-auto w-28"
					/>
					<p className="m-0">
						Your cart is empty. Whole leaves, nothing else, from the hills of
						Chiang Rai.
					</p>
					<p className="m-0">
						One pack is {formatUsd(RETAIL_CENTS)}. Subscribe for{" "}
						{formatUsd(SUBSCRIPTION_CENTS)} a pack.
					</p>
					<Link className={buttonClass} to="/tea">
						Choose your pack
					</Link>
				</div>
			) : (
				<div
					className="grid max-w-lg gap-4 border border-line bg-paper p-4"
					data-ht="cart-line"
				>
					<p className="m-0">KuabCha loose-leaf green tea</p>
					<p className="m-0">
						{shell.cartPlanKind === "subscription"
							? `Subscription, every ${shell.subscriptionIntervalWeeks} weeks`
							: "One-time purchase"}
						. {qty} at {formatUsd(unitCents)}.
					</p>
					<p className="m-0">
						Subtotal <span data-ht="cart-subtotal">{formatUsd(total)}</span>
					</p>
					<p className="m-0">
						Total <span data-ht="cart-total">{formatUsd(total)}</span>.
					</p>
					<form
						className="flex flex-wrap items-end gap-3"
						method="post"
						action="/cart"
					>
						<Csrf />
						<input type="hidden" name="plan" value={shell.cartPlanKind} />
						<label className="grid text-sm" htmlFor="qty">
							Packs
							<input
								id="qty"
								className={fieldClass}
								name="qty"
								type="number"
								min={0}
								max={999}
								defaultValue={qty}
								required
							/>
						</label>
						<button className={quietButtonClass} type="submit">
							Update
						</button>
					</form>
					<Link to="/checkout" className={buttonClass}>
						Checkout
					</Link>
				</div>
			)}
		</Page>
	);
}
