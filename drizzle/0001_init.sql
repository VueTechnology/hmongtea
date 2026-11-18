create table accounts (
	id uuid primary key,
	email text not null unique,
	password_hash text not null,
	role text not null,
	side text not null,
	status text not null,
	name text not null default '',
	phone text not null default '',
	legal_name text not null default '',
	dba text not null default '',
	business_address text not null default '',
	business_phone text not null default '',
	contact_person text not null default '',
	website text not null default '',
	resale_certificate text not null default '',
	tax_id_cipher text not null default '',
	tax_id_last4 text not null default '',
	net_terms boolean not null default false,
	email_opt_out boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint accounts_email_lower check (email = lower(email)),
	constraint accounts_role check (role in ('customer', 'staff')),
	constraint accounts_side check (side in ('retail', 'wholesale')),
	constraint accounts_status check (status in ('active', 'pending', 'rejected')),
	constraint accounts_staff check (role <> 'staff' or (side = 'retail' and status = 'active')),
	constraint accounts_retail check (side <> 'retail' or status = 'active'),
	constraint accounts_net_terms check (net_terms = false or side = 'wholesale')
);

create table sessions (
	id uuid primary key,
	account_id uuid not null references accounts (id) on delete cascade,
	token_hash text not null unique,
	csrf_token text not null,
	expires_at timestamptz not null,
	created_at timestamptz not null default now()
);

create index sessions_account_idx on sessions (account_id);

create table carts (
	account_id uuid primary key references accounts (id) on delete cascade,
	side text not null,
	qty integer not null,
	updated_at timestamptz not null default now(),
	constraint carts_side check (side in ('retail', 'wholesale')),
	constraint carts_qty check (qty >= 0 and qty <= 999)
);

create table orders (
	id uuid primary key,
	account_id uuid not null references accounts (id),
	side text not null,
	status text not null,
	contact_name text not null,
	contact_email text not null,
	contact_phone text not null default '',
	ship_line1 text not null,
	ship_line2 text not null default '',
	ship_city text not null,
	ship_region text not null,
	ship_postal_code text not null,
	ship_country text not null,
	qty integer not null,
	unit_cents integer not null,
	total_cents integer not null,
	payment_mode text not null,
	stripe_session_id text,
	net_terms boolean not null default false,
	ship_date date,
	tracking_number text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint orders_side check (side in ('retail', 'wholesale')),
	constraint orders_status check (status in ('unpaid', 'placed', 'shipped', 'cancelled')),
	constraint orders_qty check (qty > 0 and qty <= 999),
	constraint orders_unit check (unit_cents > 0),
	constraint orders_total check (total_cents >= 0),
	constraint orders_payment check (payment_mode in ('demo', 'stripe', 'net-terms-placeholder')),
	constraint orders_terms_side check (net_terms = false or side = 'wholesale'),
	constraint orders_terms_mode check (
		(payment_mode = 'net-terms-placeholder' and net_terms = true)
		or payment_mode in ('demo', 'stripe')
	),
	constraint orders_ship_fields check (
		(
			status = 'shipped'
			and ship_date is not null
			and tracking_number is not null
			and length(btrim(tracking_number)) > 0
		)
		or (
			status <> 'shipped'
			and ship_date is null
			and tracking_number is null
		)
	)
);

create index orders_account_idx on orders (account_id);
create index orders_side_status_idx on orders (side, status);

create table signups (
	id uuid primary key,
	email text not null unique,
	name text not null default '',
	status text not null,
	confirm_token_hash text not null unique,
	created_at timestamptz not null default now(),
	confirmed_at timestamptz,
	constraint signups_email_lower check (email = lower(email)),
	constraint signups_status check (status in ('pending', 'confirmed', 'unsubscribed'))
);

create table unsubscribe_tokens (
	token_hash text primary key,
	email text not null,
	created_at timestamptz not null default now(),
	constraint unsubscribe_email_lower check (email = lower(email))
);

create index unsubscribe_email_idx on unsubscribe_tokens (email);

create table suppressions (
	email text primary key,
	created_at timestamptz not null default now(),
	constraint suppressions_email_lower check (email = lower(email))
);

create table blasts (
	id uuid primary key,
	staff_id uuid not null references accounts (id),
	audience text not null,
	subject text not null,
	body text not null,
	created_at timestamptz not null default now(),
	constraint blasts_audience check (audience in ('preorder', 'updates'))
);

create table blast_recipients (
	id uuid primary key,
	blast_id uuid not null references blasts (id) on delete cascade,
	email text not null,
	status text not null,
	created_at timestamptz not null default now(),
	constraint blast_recipients_status check (status in ('logged', 'sent', 'failed'))
);

create index blast_recipients_blast_idx on blast_recipients (blast_id);

create table mail_log (
	id uuid primary key,
	to_email text not null,
	subject text not null,
	body text not null,
	created_at timestamptz not null default now()
);

create table audit_log (
	id uuid primary key,
	staff_id uuid references accounts (id),
	action text not null,
	subject_type text not null,
	subject_id text not null default '',
	detail text not null default '',
	created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);

create table campaign (
	id integer primary key,
	target_cents integer not null,
	raised_cents integer not null,
	placeholder boolean not null default true,
	updated_at timestamptz not null default now(),
	constraint campaign_one_row check (id = 1),
	constraint campaign_target check (target_cents > 0),
	constraint campaign_raised check (raised_cents >= 0),
	constraint campaign_placeholder check (placeholder)
);

-- Placeholder figures for the public progress bar. Not a live campaign.
insert into campaign (id, target_cents, raised_cents, placeholder)
values (1, 2500000, 640000, true);

create table rate_limits (
	bucket text primary key,
	hits integer not null,
	window_start timestamptz not null
);
