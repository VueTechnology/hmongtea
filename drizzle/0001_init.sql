create table accounts (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  role text not null,
  account_type text,
  name text not null default '',
  phone text not null default '',
  status text not null,
  email_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_role_check check (role in ('customer', 'staff')),
  constraint accounts_type_check check (account_type is null or account_type in ('retail', 'wholesale')),
  constraint accounts_status_check check (status in ('active', 'pending', 'rejected')),
  constraint accounts_email_lower check (email = lower(email)),
  constraint accounts_role_shape check (
    (role = 'staff' and account_type is null and status = 'active')
    or (role = 'customer' and account_type is not null)
  )
);

create table wholesale_profiles (
  account_id uuid primary key references accounts (id) on delete cascade,
  legal_name text not null,
  dba text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  region text not null,
  postal text not null,
  country text not null,
  phone text not null,
  contact_person text not null,
  website text,
  reseller_certificate text,
  tax_id_cipher text not null,
  tax_id_last4 text not null,
  net_terms_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  constraint wholesale_last4_check check (tax_id_last4 ~ '^[0-9]{4}$')
);

create table addresses (
  account_id uuid primary key references accounts (id) on delete cascade,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  region text not null,
  postal text not null,
  country text not null,
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,
  account_id uuid not null references accounts (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table counters (
  name text primary key,
  value integer not null
);

insert into counters (name, value) values ('preorder', 1000);

create table preorders (
  id uuid primary key,
  number text not null unique,
  account_id uuid not null references accounts (id),
  side text not null,
  status text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  region text not null,
  postal text not null,
  country text not null,
  qty integer not null,
  unit_cents integer not null,
  total_cents integer not null,
  tier_label text not null,
  ship_date date,
  tracking_number text,
  payment_mode text not null,
  payment_status text not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint preorders_side_check check (side in ('retail', 'wholesale')),
  constraint preorders_status_check check (status in ('placed', 'shipped', 'cancelled')),
  constraint preorders_qty_check check (qty > 0 and qty <= 999),
  constraint preorders_money_check check (unit_cents > 0 and total_cents = qty * unit_cents),
  constraint preorders_email_lower check (contact_email = lower(contact_email)),
  constraint preorders_payment_pair check (
    (payment_mode = 'demo' and payment_status = 'demo')
    or (payment_mode = 'stripe_test' and payment_status in ('unpaid', 'paid'))
  ),
  constraint preorders_shipped_fields check (
    status <> 'shipped'
    or (ship_date is not null and tracking_number is not null and length(btrim(tracking_number)) > 0)
  ),
  constraint preorders_cancelled_at check (status <> 'cancelled' or cancelled_at is not null)
);

create index preorders_account_idx on preorders (account_id);
create index preorders_status_idx on preorders (status);
create index preorders_side_idx on preorders (side);

create table signups (
  id uuid primary key,
  email text not null unique,
  name text,
  status text not null,
  confirm_token_hash text unique,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint signups_status_check check (status in ('pending', 'confirmed', 'unsubscribed')),
  constraint signups_email_lower check (email = lower(email)),
  constraint signups_confirm_token check (status <> 'pending' or confirm_token_hash is not null),
  constraint signups_status_times check (
    (status = 'pending' and confirmed_at is null and unsubscribed_at is null)
    or (status = 'confirmed' and confirmed_at is not null and unsubscribed_at is null)
    or (status = 'unsubscribed' and unsubscribed_at is not null)
  )
);

create table unsubscribe_tokens (
  token_hash text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index unsubscribe_tokens_email_idx on unsubscribe_tokens (email);

create table blasts (
  id uuid primary key,
  staff_id uuid not null references accounts (id),
  audience text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint blasts_audience_check check (audience in ('preorder', 'updates'))
);

create table blast_recipients (
  id uuid primary key,
  blast_id uuid not null references blasts (id) on delete cascade,
  email text not null,
  status text not null,
  created_at timestamptz not null default now(),
  constraint blast_recipients_status_check check (status in ('sent', 'skipped_unsubscribed', 'skipped_pending'))
);

create index blast_recipients_blast_idx on blast_recipients (blast_id);

create table mail_log (
  id uuid primary key,
  to_email text not null,
  subject text not null,
  body text not null,
  mode text not null,
  created_at timestamptz not null default now(),
  constraint mail_log_mode_check check (mode in ('demo', 'resend'))
);

create table audit_log (
  id uuid primary key,
  staff_id uuid not null references accounts (id),
  action text not null,
  entity text not null,
  entity_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);

-- Placeholder figures for the public funding bar. Not a live campaign total.
create table campaign (
  id integer primary key,
  target_cents integer not null,
  raised_cents integer not null,
  label text not null,
  updated_at timestamptz not null default now(),
  constraint campaign_one_row check (id = 1),
  constraint campaign_amounts check (target_cents > 0 and raised_cents >= 0),
  constraint campaign_placeholder check (label = 'placeholder')
);

insert into campaign (id, target_cents, raised_cents, label)
values (1, 2500000, 840000, 'placeholder');

create table rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key (bucket, window_start)
);
