import { Money, Status } from "#/ui/site";

export type OrderCard = {
	id: string;
	side: string;
	status: string;
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	line1: string;
	line2: string;
	city: string;
	region: string;
	postalCode: string;
	country: string;
	qty: number;
	unitCents: number;
	totalCents: number;
	paymentMode: string;
	netTerms: boolean;
	shipDate: string | null;
	trackingNumber: string | null;
	createdAt: string;
};

export function paymentLabel(mode: string): string {
	if (mode === "demo") return "Demo checkout. No card was charged.";
	if (mode === "stripe") return "Card payment.";
	if (mode === "net-terms-placeholder")
		return "Net terms is a placeholder flag. It does not open a credit line.";
	return mode;
}

export function OrderFacts({ order }: { order: OrderCard }) {
	return (
		<dl className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-2">
			<div>
				<dt className="text-sm text-muted">Status</dt>
				<dd className="m-0">
					<Status value={order.status} />
				</dd>
			</div>
			<div>
				<dt className="text-sm text-muted">Side</dt>
				<dd className="m-0" data-testid="order-side">
					{order.side === "wholesale" ? "Wholesale" : "Retail"}
				</dd>
			</div>
			<div>
				<dt className="text-sm text-muted">Packs</dt>
				<dd className="m-0">{order.qty}</dd>
			</div>
			<div>
				<dt className="text-sm text-muted">Unit price</dt>
				<dd className="m-0">
					<Money cents={order.unitCents} testId="unit-price" />
				</dd>
			</div>
			<div>
				<dt className="text-sm text-muted">Total</dt>
				<dd className="m-0">
					<Money cents={order.totalCents} testId="order-total" />
				</dd>
			</div>
			<div>
				<dt className="text-sm text-muted">Placed</dt>
				<dd className="m-0">{order.createdAt.slice(0, 10)}</dd>
			</div>
			<div className="sm:col-span-2">
				<dt className="text-sm text-muted">Ship to</dt>
				<dd className="m-0">
					{order.contactName}
					<br />
					{order.line1}
					{order.line2 ? `, ${order.line2}` : ""}
					<br />
					{order.city}, {order.region} {order.postalCode} {order.country}
					<br />
					{order.contactPhone}
				</dd>
			</div>
			<div className="sm:col-span-2">
				<dt className="text-sm text-muted">Payment</dt>
				<dd className="m-0">{paymentLabel(order.paymentMode)}</dd>
			</div>
			{order.trackingNumber ? (
				<div className="sm:col-span-2">
					<dt className="text-sm text-muted">Tracking</dt>
					<dd className="m-0" data-testid="tracking">
						{order.shipDate} {order.trackingNumber}
					</dd>
				</div>
			) : null}
		</dl>
	);
}
