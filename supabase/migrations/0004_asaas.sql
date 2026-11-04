-- Pagamentos via Asaas: CPF do cliente (obrigatório na cobrança), id do
-- cliente no Asaas e id da cobrança em ingressos e comandas.
alter table customers add column if not exists cpf text;
alter table customers add column if not exists asaas_id text;
alter table tickets add column if not exists payment_id text;
alter table tabs add column if not exists payment_id text;
create index if not exists tickets_payment_idx on tickets(payment_id);
create index if not exists tabs_payment_idx on tabs(payment_id);
