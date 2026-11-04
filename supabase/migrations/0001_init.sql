-- =====================================================================
-- VipFlow — schema inicial (Supabase / Postgres)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run
-- O app acessa as tabelas pelo servidor com a SERVICE ROLE (ignora RLS).
-- O front (chave anon) só lê o que é público: casa, eventos, lotes e cardápio.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists venues (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  name text not null,
  city text not null default '',
  lat double precision not null,
  lng double precision not null,
  geofence_m integer not null default 80,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references venues(id) on delete cascade,
  slug text unique not null,
  name text not null,
  starts_at timestamptz not null,
  capacity integer not null default 1000,
  cover_color text not null default '#7b2ff7',
  created_at timestamptz not null default now()
);
create index if not exists events_starts_idx on events(starts_at);

create table if not exists ticket_types (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  quantity integer not null,
  sold integer not null default 0
);

create table if not exists customers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text unique not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists promoters (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text not null,
  commission_cents integer not null default 1500
);

create table if not exists tickets (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references events(id) on delete cascade,
  ticket_type_id text not null references ticket_types(id),
  customer_id text not null references customers(id),
  promoter_id text references promoters(id),
  status text not null default 'pending' check (status in ('pending','paid','used','cancelled')),
  qr_seed text not null,
  price_cents integer not null default 0,
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tickets_event_idx on tickets(event_id);
create index if not exists tickets_customer_idx on tickets(customer_id);

create table if not exists checkins (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references tickets(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  gate text not null default 'Entrada 1',
  at timestamptz not null default now(),
  offline boolean not null default false,
  unique (ticket_id) -- impede entrada dupla
);
create index if not exists checkins_event_idx on checkins(event_id);

create table if not exists guest_list (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references events(id) on delete cascade,
  promoter_id text not null references promoters(id),
  customer_id text not null references customers(id),
  status text not null default 'pending' check (status in ('pending','on_the_way','inside')),
  validated_at timestamptz
);
create index if not exists guest_list_event_promoter_idx on guest_list(event_id, promoter_id);

create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references venues(id) on delete cascade,
  name text not null,
  category text not null,
  price_cents integer not null,
  cost_cents integer not null default 0,
  stock integer not null default 0,
  active boolean not null default true,
  promo_price_cents integer,
  promo_until timestamptz
);

create table if not exists tabs (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references events(id) on delete cascade,
  customer_id text not null references customers(id),
  table_label text not null default 'Pista',
  status text not null default 'open' check (status in ('open','paid')),
  opened_at timestamptz not null default now()
);

create table if not exists order_items (
  id text primary key default gen_random_uuid()::text,
  tab_id text not null references tabs(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  product_id text not null references products(id),
  qty integer not null check (qty > 0),
  unit_price_cents integer not null,
  status text not null default 'queued' check (status in ('queued','preparing','ready','delivered','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists order_items_event_idx on order_items(event_id);
create index if not exists order_items_tab_idx on order_items(tab_id);

create table if not exists invites (
  id text primary key default gen_random_uuid()::text,
  customer_id text not null references customers(id),
  event_id text not null references events(id) on delete cascade,
  ticket_id text not null references tickets(id),
  reason text not null,
  status text not null default 'sent' check (status in ('sent','accepted','ignored')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- RLS
alter table venues enable row level security;
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table promoters enable row level security;
alter table tickets enable row level security;
alter table checkins enable row level security;
alter table guest_list enable row level security;
alter table tabs enable row level security;
alter table order_items enable row level security;
alter table invites enable row level security;

drop policy if exists "public read venues" on venues;
create policy "public read venues" on venues for select using (true);
drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (true);
drop policy if exists "public read ticket_types" on ticket_types;
create policy "public read ticket_types" on ticket_types for select using (true);
drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (active);
-- Demais tabelas: sem política para anon = acesso só pelo servidor (service role).

-- ------------------------------------------------------------- views de análise
-- Úteis quando o volume crescer: a IA pode ler direto destas views.
create or replace view v_customer_spend as
select t.customer_id, oi.event_id, sum(oi.qty * oi.unit_price_cents) as spend_cents
from order_items oi join tabs t on t.id = oi.tab_id
where oi.status <> 'cancelled'
group by t.customer_id, oi.event_id;

create or replace view v_product_sales_28d as
select p.id as product_id, p.name, coalesce(sum(oi.qty), 0) as units,
       coalesce(sum(oi.qty * oi.unit_price_cents), 0) as revenue_cents,
       coalesce(sum(oi.qty * (oi.unit_price_cents - p.cost_cents)), 0) as margin_cents
from products p
left join order_items oi on oi.product_id = p.id and oi.created_at > now() - interval '28 days' and oi.status <> 'cancelled'
group by p.id, p.name;
