-- Operação real: acesso individual de promoter, venda de lote sem estourar
-- quantidade (atômico) e controle de migrações aplicadas.

alter table promoters add column if not exists access_code text;
update promoters set access_code = substr(md5(random()::text), 1, 10) where access_code is null;
create unique index if not exists promoters_access_code_idx on promoters(access_code);
alter table promoters add column if not exists active boolean not null default true;

-- Reserva 1 unidade do lote de forma atômica. Retorna false se esgotou.
create or replace function reserve_ticket(p_ticket_type_id text) returns boolean
language plpgsql as $$
declare ok boolean;
begin
  update ticket_types set sold = sold + 1
   where id = p_ticket_type_id and sold < quantity
  returning true into ok;
  return coalesce(ok, false);
end $$;

create table if not exists _vipflow_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
