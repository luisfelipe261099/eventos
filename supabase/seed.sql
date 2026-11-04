-- Dados iniciais mínimos para começar a usar com Supabase.
-- Troque nome, coordenadas (lat/lng da porta da casa) e o cardápio pelos reais.

insert into venues (id, slug, name, city, lat, lng, geofence_m) values
  ('venue-1', 'minha-casa', 'Minha Casa', 'Curitiba', -25.4284, -49.2733, 80)
on conflict (id) do nothing;

insert into events (id, venue_id, slug, name, starts_at, capacity) values
  ('ev-1', 'venue-1', 'sexta-open-bar', 'Sexta Open Bar', date_trunc('week', now()) + interval '4 days 23 hours' + interval '3 hours', 1500)
on conflict (id) do nothing;

insert into ticket_types (id, event_id, name, price_cents, quantity) values
  ('tt-1-pista', 'ev-1', 'Pista · 1º lote', 6000, 1200),
  ('tt-1-cam', 'ev-1', 'Camarote VIP', 15000, 150)
on conflict (id) do nothing;

insert into promoters (id, name, phone, commission_cents) values
  ('pr-1', 'Promoter 1', '+5541900000000', 1500)
on conflict (id) do nothing;

insert into products (id, venue_id, name, category, price_cents, cost_cents, stock) values
  ('p-chopp', 'venue-1', 'Chopp 500 ml', 'Cervejas', 1800, 600, 800),
  ('p-gin', 'venue-1', 'Gin tônica', 'Drinks', 3200, 1100, 300),
  ('p-balde', 'venue-1', 'Balde 6 long necks', 'Cervejas', 7900, 3300, 120),
  ('p-caipi-m', 'venue-1', 'Caipirinha de morango', 'Drinks', 2800, 900, 200),
  ('p-caipi-k', 'venue-1', 'Caipirinha de kiwi', 'Drinks', 2800, 900, 180),
  ('p-fritas', 'venue-1', 'Porção de fritas', 'Petiscos', 3600, 1000, 150),
  ('p-whisky', 'venue-1', 'Whisky 12 anos (garrafa)', 'Garrafas', 189000, 70000, 12)
on conflict (id) do nothing;
