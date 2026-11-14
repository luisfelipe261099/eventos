-- O app lê e grava tudo pelo servidor (conexão Postgres direta ou chave de serviço),
-- que ignora RLS. As leituras públicas pela chave anônima do Supabase não são usadas
-- e expunham colunas sensíveis da tabela venues (hash de senha, chave do Asaas cifrada,
-- e-mail e telefone do dono). Sem política, a chave anônima não lê nada.
drop policy if exists "public read venues" on venues;
drop policy if exists "public read events" on events;
drop policy if exists "public read ticket_types" on ticket_types;
drop policy if exists "public read products" on products;
alter table leads enable row level security;
