alter table accounts
	add column listed_store boolean not null default false;

alter table accounts
	add column store_city text not null default '';

alter table accounts
	add column store_state text not null default '';

alter table accounts
	add column store_zip text not null default '';

alter table accounts
	add column store_directions text not null default '';
