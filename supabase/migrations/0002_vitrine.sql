-- Vitrine de eventos: flyer, categoria, descrição e endereço da casa.
alter table venues add column if not exists address text;
alter table events add column if not exists cover_url text;
alter table events add column if not exists category text default 'Festas';
alter table events add column if not exists description text;
alter table events add column if not exists min_age integer default 18;

-- Bucket público para os flyers (Storage → "flyers")
insert into storage.buckets (id, name, public) values ('flyers', 'flyers', true)
on conflict (id) do nothing;
