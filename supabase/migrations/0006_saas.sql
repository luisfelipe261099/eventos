-- SaaS: várias casas na mesma instalação. Cada casa tem a própria conta
-- (e-mail + senha), o próprio plano, a própria chave do Asaas e os próprios
-- promoters. A taxa da VipFlow cobrada em cada ingresso fica gravada no ingresso.

alter table venues add column if not exists owner_name text;
alter table venues add column if not exists owner_email text;
alter table venues add column if not exists owner_phone text;
alter table venues add column if not exists doc text;                -- CPF ou CNPJ de quem paga a mensalidade
alter table venues add column if not exists password_hash text;
alter table venues add column if not exists plan text not null default 'essencial';
alter table venues add column if not exists fee_mode text not null default 'buyer'; -- buyer: taxa somada no checkout | venue: a casa absorve
alter table venues add column if not exists plan_status text not null default 'trial'; -- trial | active | past_due | blocked
alter table venues add column if not exists trial_ends_at timestamptz;
alter table venues add column if not exists asaas_key_enc text;      -- chave de API do Asaas da casa, cifrada
alter table venues add column if not exists billing_customer_id text; -- cliente na conta Asaas da VipFlow
alter table venues add column if not exists billing_subscription_id text;
update venues set trial_ends_at = now() + interval '30 days' where trial_ends_at is null;
create unique index if not exists venues_owner_email_idx on venues (lower(owner_email)) where owner_email is not null;

alter table promoters add column if not exists venue_id text references venues(id) on delete cascade;
update promoters set venue_id = (select id from venues order by created_at, id limit 1) where venue_id is null;
create index if not exists promoters_venue_idx on promoters(venue_id);

alter table tickets add column if not exists fee_cents integer not null default 0;   -- taxa VipFlow deste ingresso
alter table tickets add column if not exists fee_split boolean not null default false; -- true: já repassada pelo split do Asaas

-- Interessados que pediram contato pela página de planos.
create table if not exists leads (
  id text primary key,
  name text not null,
  venue_name text not null default '',
  phone text not null,
  city text not null default '',
  plan text not null default '',
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
