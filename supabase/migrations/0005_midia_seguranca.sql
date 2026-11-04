-- Flyers guardados no próprio banco (sem depender de outro serviço de arquivos),
-- estorno de ingresso e controle de tentativas de login.
create table if not exists media (
  id text primary key,
  mime text not null,
  bytes bytea not null,
  size integer not null,
  created_at timestamptz not null default now()
);

alter table tickets drop constraint if exists tickets_status_check;
alter table tickets add constraint tickets_status_check check (status in ('pending','paid','used','cancelled','refunded'));
alter table tickets add column if not exists refunded_at timestamptz;

create table if not exists login_attempts (
  id bigserial primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_ip_at_idx on login_attempts(ip, at);
alter table media enable row level security;
alter table login_attempts enable row level security;
