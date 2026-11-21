import { useEffect, useRef, useState } from "react";
import { formatUsd } from "#/domain/money";
import {
	planUnitCents,
	RETAIL_CENTS,
	SHIP_WINDOW,
	SUBSCRIPTION_CENTS,
} from "#/domain/prices";
import type { PlanKind } from "#/domain/purchase-plan";
import { buttonClass, Csrf, fieldClass, useShell } from "#/ui/site";

export function BuyBox({ id }: { id: string }) {
	const shell = useShell();
	const [plan, setPlan] = useState<PlanKind>(
		shell.cartQty > 0 ? shell.cartPlanKind : "subscription",
	);
	const [qty, setQty] = useState(1);
	const [stickyVisible, setStickyVisible] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);
	const formId = `buy-box-${id}`;
	const selectedTotal = planUnitCents(plan) * qty;

	useEffect(() => {
		const form = formRef.current;
		if (!form) return;
		const initialTop = form.getBoundingClientRect().top + window.scrollY;
		const update = () => {
			const header = Number.parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue(
					"--layout-header",
				),
			);
			setStickyVisible(form.getBoundingClientRect().top < initialTop - header);
		};
		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	return (
		<>
			<form
				ref={formRef}
				id={formId}
				className="buy-box"
				method="post"
				action="/cart"
				data-buy-box={id}
			>
				<Csrf />
				<fieldset>
					<legend>Choose your pack</legend>
					<label
						className="plan-option"
						data-ht="plan-subscribe"
						data-selected={plan === "subscription"}
					>
						<input
							type="radio"
							name="plan"
							value="subscription"
							checked={plan === "subscription"}
							onChange={() => setPlan("subscription")}
						/>
						<span>
							Subscribe and save $5.00
							<br />
							<small>Skip, change or cancel in your account</small>
						</span>
						<span className="plan-price" data-ht="price-subscribe">
							{formatUsd(SUBSCRIPTION_CENTS)}
						</span>
					</label>
					<label
						className="plan-option"
						data-ht="plan-onetime"
						data-selected={plan === "one-time"}
					>
						<input
							type="radio"
							name="plan"
							value="one-time"
							checked={plan === "one-time"}
							onChange={() => setPlan("one-time")}
						/>
						<span>Buy one pack</span>
						<span className="plan-price" data-ht="price-onetime">
							{formatUsd(RETAIL_CENTS)}
						</span>
					</label>
				</fieldset>
				<p className="buy-terms" aria-live="polite">
					{plan === "subscription"
						? `$39.94 every ${shell.subscriptionIntervalWeeks} weeks. Cancel any time in your account.`
						: `One-time purchase. Ships in ${SHIP_WINDOW}.`}
				</p>
				<div className="quantity-row">
					<label className="quantity-field" htmlFor={`${formId}-qty`}>
						Packs
						<input
							id={`${formId}-qty`}
							className={fieldClass}
							data-ht="qty"
							name="qty"
							type="number"
							inputMode="numeric"
							min={1}
							max={12}
							value={qty}
							onChange={(event) => {
								const next = Number(event.target.value);
								if (Number.isInteger(next))
									setQty(Math.min(12, Math.max(1, next)));
							}}
							required
						/>
					</label>
				</div>
				<button
					className={`${buttonClass} buy-submit`}
					data-ht="add-to-cart"
					type="submit"
				>
					{plan === "subscription"
						? "Subscribe and save $5.00"
						: "Add one pack to cart"}
				</button>
				<p className="buy-note">
					125 g (4.4 oz). Ships in {SHIP_WINDOW}. Demo checkout, no card
					charged.
				</p>
			</form>
			{stickyVisible ? (
				<div className="sticky-buy" data-ht="sticky-buy">
					<div className="sticky-buy__text" aria-live="polite">
						<strong>{formatUsd(selectedTotal)}</strong>
						{plan === "subscription"
							? `Subscription, every ${shell.subscriptionIntervalWeeks} weeks`
							: "One-time purchase"}
						{qty > 1 ? `, ${qty} packs` : ""}
					</div>
					<button
						className={`${buttonClass} sticky-buy__button`}
						form={formId}
						type="submit"
					>
						Add to cart
					</button>
				</div>
			) : null}
			<div className="sticky-buy-spacer" aria-hidden="true" />
		</>
	);
}
