-- Administradores da plataforma com e-mail e senha (além da ADMIN_PASSWORD).
-- A senha fica só como hash scrypt; nunca em texto.
create table if not exists platform_admins (
  id text primary key,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists platform_admins_email_idx on platform_admins (lower(email));
alter table platform_admins enable row level security;
