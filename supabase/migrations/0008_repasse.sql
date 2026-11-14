-- Recebimento pela conta da plataforma: o Pix das vendas cai na conta Asaas da Casa Cheia,
-- cada pagamento credita o valor da casa num extrato, e o saldo é repassado por Pix
-- para a chave que a casa cadastrou.
alter table venues add column if not exists pix_key text;
alter table venues add column if not exists pix_key_type text;      -- CPF, CNPJ, EMAIL, PHONE, EVP
alter table venues add column if not exists payout_auto boolean not null default true;

-- Extrato da casa: cada linha muda o saldo dela (positivo = a receber).
create table if not exists ledger (
  id text primary key,
  venue_id text not null references venues(id) on delete cascade,
  kind text not null check (kind in ('sale_ticket','sale_tab','refund','adjust')),
  ref text not null,                              -- id da cobrança no Asaas (ou do ajuste)
  gross_cents integer not null default 0,         -- valor pago pelo cliente
  asaas_fee_cents integer not null default 0,     -- tarifa do Asaas sobre o Pix
  platform_fee_cents integer not null default 0,  -- taxa da Casa Cheia
  amount_cents integer not null,                  -- efeito no saldo da casa
  note text,
  created_at timestamptz not null default now(),
  unique (kind, ref)                              -- o mesmo pagamento nunca credita duas vezes
);
create index if not exists ledger_venue_idx on ledger(venue_id);

-- Repasses por Pix para a casa.
create table if not exists payouts (
  id text primary key,
  venue_id text not null references venues(id) on delete cascade,
  value_cents integer not null check (value_cents > 0),
  pix_key text not null,
  pix_key_type text not null,
  transfer_id text unique,                        -- id da transferência no Asaas
  status text not null default 'requested' check (status in ('requested','awaiting_authorization','pending','done','failed','cancelled')),
  fee_cents integer not null default 0,
  fail_reason text,
  auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payouts_venue_idx on payouts(venue_id);
-- no máximo um repasse em andamento por casa (evita dois cliques sacarem o mesmo saldo)
create unique index if not exists payouts_one_open_idx on payouts(venue_id) where status in ('requested','awaiting_authorization','pending');

alter table ledger enable row level security;
alter table payouts enable row level security;
