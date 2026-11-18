alter table accounts add column pricing_tier text;

alter table accounts add constraint accounts_pricing_tier check (
	pricing_tier is null or pricing_tier in ('case', 'half', 'pallet')
);

alter table accounts add constraint accounts_pricing_tier_side check (
	pricing_tier is null or (role = 'customer' and side = 'wholesale')
);

alter table orders add column placed_by_staff_id uuid references accounts (id);

create table password_resets (
	id uuid primary key,
	account_id uuid not null references accounts (id) on delete cascade,
	token_hash text not null unique,
	purpose text not null,
	expires_at timestamptz not null,
	used_at timestamptz,
	created_at timestamptz not null default now(),
	constraint password_resets_purpose check (purpose in ('set', 'reset'))
);

create index password_resets_account_idx on password_resets (account_id);
