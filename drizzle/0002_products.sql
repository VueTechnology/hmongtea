create table products (
	sku text primary key,
	name text not null,
	on_hand integer not null,
	constraint products_on_hand check (on_hand >= 0 and on_hand <= 1000000)
);

insert into products (sku, name, on_hand)
values ('KUABCHA-PACK', 'KuabCha loose-leaf green tea', 5000);
