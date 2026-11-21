alter table carts
	add column purchase_plan text not null default 'one-time';

alter table carts
	add constraint carts_purchase_plan check (purchase_plan in ('one-time', 'subscription'));

alter table orders alter column account_id drop not null;

alter table orders add column purchase_plan text not null default 'one-time';
alter table orders add column subscription_status text;
alter table orders add column subscription_interval_weeks integer;
alter table orders add column next_order_on date;
alter table orders add column guest_claim_hash text unique;

alter table orders
	add constraint orders_purchase_plan check (purchase_plan in ('one-time', 'subscription'));

alter table orders
	add constraint orders_wholesale_plan check (side = 'retail' or purchase_plan = 'one-time');

alter table orders
	add constraint orders_subscription_fields check (
		(
			purchase_plan = 'one-time'
			and subscription_status is null
			and subscription_interval_weeks is null
			and next_order_on is null
		)
		or (
			side = 'retail'
			and purchase_plan = 'subscription'
			and subscription_interval_weeks between 1 and 52
			and (
				(subscription_status = 'active' and next_order_on is not null)
				or (subscription_status = 'cancelled' and next_order_on is null)
			)
		)
	);

create table store_settings (
	id integer primary key,
	subscription_interval_weeks integer not null default 4,
	updated_at timestamptz not null default now(),
	constraint store_settings_one_row check (id = 1),
	constraint store_settings_interval check (subscription_interval_weeks between 1 and 52)
);

insert into store_settings (id, subscription_interval_weeks) values (1, 4);
