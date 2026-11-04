/**
 * Dados de exemplo para o MODO DEMO.
 * Gera 12 sextas passadas + a próxima sexta, com ingressos, check-ins,
 * comandas e consumo — o suficiente para a IA ter o que analisar.
 * Tudo é fictício e determinístico (mesma semente → mesmos dados).
 */
import type {
  Checkin, Customer, EventItem, GuestListEntry, Invite, OrderItem, Product,
  Promoter, Tab, Ticket, TicketType, Venue,
} from "./types";

export interface DemoData {
  venues: Venue[];
  events: EventItem[];
  ticket_types: TicketType[];
  customers: Customer[];
  tickets: Ticket[];
  checkins: Checkin[];
  promoters: Promoter[];
  guest_list: GuestListEntry[];
  products: Product[];
  tabs: Tab[];
  order_items: OrderItem[];
  invites: Invite[];
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabi", "Henrique", "Isa", "João", "Larissa", "Lucas", "Mariana", "Nina", "Otávio", "Paula", "Rodrigo", "Sofia", "Thiago", "Vitória", "Yuri", "Bia", "Caio", "Duda", "Enzo", "Fernanda", "Gui", "Helena", "Igor", "Jéssica"];
const LAST = ["Souza", "Lima", "Dias", "Reis", "Prado", "Mota", "Alves", "Costa", "Rocha", "Nunes", "Pires", "Melo"];

export function nextFriday(from = new Date()): Date {
  const d = new Date(from);
  // calcula no fuso de Brasília (UTC-3), independente do fuso do servidor
  const br = new Date(d.getTime() - 3 * 36e5);
  const add = (5 - br.getUTCDay() + 7) % 7;
  br.setUTCDate(br.getUTCDate() + add);
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 23 + 3));
}

export function buildDemoData(): DemoData {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

  const venue: Venue = { id: "venue-1", slug: "casa-demo", name: "Casa Demo", city: "Curitiba", lat: -25.4284, lng: -49.2733, geofence_m: 80, address: "Rua XV de Novembro, 1000 · Centro, Curitiba" };
  const galpao: Venue = { id: "venue-2", slug: "galpao-41", name: "Galpão 41", city: "Curitiba", lat: -25.4405, lng: -49.2620, geofence_m: 80, address: "Rua Engenheiros Rebouças, 410 · Rebouças, Curitiba" };
  const quintal: Venue = { id: "venue-3", slug: "quintal-batel", name: "Quintal Batel", city: "Curitiba", lat: -25.4420, lng: -49.2890, geofence_m: 60, address: "Av. do Batel, 1500 · Batel, Curitiba" };

  const products: Product[] = [
    { id: "p-chopp", name: "Chopp 500 ml", category: "Cervejas", price_cents: 1800, cost_cents: 600, stock: 800 },
    { id: "p-gin", name: "Gin tônica", category: "Drinks", price_cents: 3200, cost_cents: 1100, stock: 300 },
    { id: "p-balde", name: "Balde 6 long necks", category: "Cervejas", price_cents: 7900, cost_cents: 3300, stock: 120 },
    { id: "p-caipi-m", name: "Caipirinha de morango", category: "Drinks", price_cents: 2800, cost_cents: 900, stock: 200 },
    { id: "p-caipi-k", name: "Caipirinha de kiwi", category: "Drinks", price_cents: 2800, cost_cents: 900, stock: 180 },
    { id: "p-vinho", name: "Vinho taça", category: "Drinks", price_cents: 3500, cost_cents: 1500, stock: 90 },
    { id: "p-espum", name: "Espumante (garrafa)", category: "Garrafas", price_cents: 18000, cost_cents: 7000, stock: 30 },
    { id: "p-whisky", name: "Whisky 12 anos (garrafa)", category: "Garrafas", price_cents: 189000, cost_cents: 70000, stock: 12 },
    { id: "p-champ", name: "Champanhe (garrafa)", category: "Garrafas", price_cents: 99000, cost_cents: 42000, stock: 16 },
    { id: "p-energ", name: "Combo energético (6x)", category: "Combos", price_cents: 24000, cost_cents: 9000, stock: 60 },
    { id: "p-fritas", name: "Porção de fritas", category: "Petiscos", price_cents: 3600, cost_cents: 1000, stock: 150 },
    { id: "p-mista", name: "Porção mista premium", category: "Petiscos", price_cents: 39000, cost_cents: 14000, stock: 25 },
  ].map((p) => ({ ...p, venue_id: venue.id, active: true, promo_price_cents: null, promo_until: null })) as Product[];

  // popularidade para clientes "comuns"
  const weights: [string, number][] = [["p-chopp", 40], ["p-gin", 24], ["p-balde", 12], ["p-caipi-m", 10], ["p-fritas", 8], ["p-caipi-k", 0.5], ["p-vinho", 0.4], ["p-espum", 0.2]];
  const wsum = weights.reduce((s, [, w]) => s + w, 0);
  const pickProduct = () => {
    let x = r() * wsum;
    for (const [id, w] of weights) { if ((x -= w) <= 0) return id; }
    return "p-chopp";
  };

  const customers: Customer[] = [
    { id: "c-rafael", name: "Rafael M.", phone: "+5541999990001" },
    { id: "c-juliana", name: "Juliana P.", phone: "+5541999990002" },
    { id: "c-marcos", name: "Marcos T.", phone: "+5541999990003" },
    { id: "c-camila", name: "Camila S.", phone: "+5541999990004" },
  ];
  for (let i = 0; i < 90; i++) customers.push({ id: `c-${i}`, name: `${pick(FIRST)} ${pick(LAST).charAt(0)}.`, phone: `+55419${String(80000000 + i)}` });

  const promoters: Promoter[] = [
    { id: "pr-1", name: "Léo Promoter", phone: "+5541988887777", commission_cents: 1500 },
    { id: "pr-2", name: "Bia Eventos", phone: "+5541988886666", commission_cents: 1500 },
  ];

  const events: EventItem[] = []; const ticket_types: TicketType[] = []; const tickets: Ticket[] = [];
  const checkins: Checkin[] = []; const tabs: Tab[] = []; const order_items: OrderItem[] = []; const guest_list: GuestListEntry[] = [];

  const upcoming = nextFriday();
  const names = ["Sexta Open Bar", "Sexta Premium", "Sexta Neon", "Sexta Funk & Pop", "Sexta Sertaneja"];
  let n = 0;
  for (let w = 12; w >= 0; w--) {
    const d = new Date(upcoming); d.setDate(d.getDate() - w * 7);
    const isLive = w === 0;
    const ev: EventItem = { id: `ev-${w}`, venue_id: venue.id, slug: isLive ? "sexta-open-bar" : `sexta-${d.toISOString().slice(0, 10)}`, name: isLive ? "Sexta Open Bar" : names[w % names.length], starts_at: d.toISOString(), capacity: 1500, cover_color: "#7b2ff7", cover_url: "/posters/sexta-open-bar.jpg", category: "Festas", min_age: 18, description: "Gin, chopp e caipirinha à vontade até 1h. Pista com DJs residentes e camarotes com serviço de garrafa." };
    events.push(ev);
    const tPista: TicketType = { id: `tt-${w}-pista`, event_id: ev.id, name: "Pista · 2º lote", price_cents: 6000, quantity: 1200, sold: 0 };
    const tCam: TicketType = { id: `tt-${w}-cam`, event_id: ev.id, name: "Camarote VIP", price_cents: 15000, quantity: 150, sold: 0 };
    ticket_types.push(tPista, tCam);

    // público varia por semana (com tendência de alta)
    const crowd = Math.floor(30 + r() * 25 + (12 - w) * 1.5);
    const attendees = new Set<string>(["c-rafael"]);
    if (r() > 0.25) attendees.add("c-juliana");
    if (r() > 0.4) attendees.add("c-marcos");
    if (r() > 0.5) attendees.add("c-camila");
    while (attendees.size < crowd) attendees.add(`c-${Math.floor(r() * 90)}`);

    for (const cid of attendees) {
      const vip = ["c-rafael", "c-juliana", "c-marcos", "c-camila"].includes(cid);
      const tt = vip ? tCam : tPista; tt.sold++;
      const promoter = r() > 0.55 ? pick(promoters).id : null;
      const tk: Ticket = { id: `tk-${++n}`, event_id: ev.id, ticket_type_id: tt.id, customer_id: cid, promoter_id: promoter, status: isLive ? "paid" : "used", qr_seed: `seed-${n}-${Math.floor(r() * 1e9).toString(36)}`, price_cents: tt.price_cents, created_at: new Date(d.getTime() - 3 * 864e5).toISOString() };
      tickets.push(tk);
      if (isLive) {
        if (promoter) guest_list.push({ id: `gl-${n}`, event_id: ev.id, promoter_id: promoter, customer_id: cid, status: r() > 0.3 ? "inside" : r() > 0.5 ? "on_the_way" : "pending", validated_at: null });
        if (r() > 0.35 || vip) checkins.push({ id: `ci-${n}`, ticket_id: tk.id, event_id: ev.id, gate: "Entrada 1", at: new Date(d.getTime() + r() * 3 * 36e5).toISOString(), offline: false });
        else continue;
      } else {
        checkins.push({ id: `ci-${n}`, ticket_id: tk.id, event_id: ev.id, gate: "Entrada 1", at: new Date(d.getTime() + r() * 3 * 36e5).toISOString(), offline: false });
      }

      // comanda
      const tab: Tab = { id: `tab-${n}`, event_id: ev.id, customer_id: cid, table_label: vip ? "Camarote 2" : `Pista`, status: isLive ? "open" : "paid", opened_at: new Date(d.getTime() + 36e5).toISOString() };
      tabs.push(tab);
      const add = (pid: string, qty: number) => {
        const p = products.find((x) => x.id === pid)!;
        order_items.push({ id: `oi-${tabs.length}-${order_items.length}`, tab_id: tab.id, event_id: ev.id, product_id: pid, qty, unit_price_cents: p.price_cents, status: isLive && r() > 0.7 ? (r() > 0.5 ? "preparing" : "queued") : "delivered", created_at: new Date(d.getTime() + (1 + r() * 3) * 36e5).toISOString() });
      };
      if (cid === "c-rafael") {
        add("p-whisky", 1); add("p-energ", 1); add("p-champ", 2); add("p-mista", 1); add("p-espum", 1); add("p-gin", 9 + Math.floor(r() * 3));
      } else if (vip) {
        add("p-espum", 1 + Math.floor(r() * 3)); add("p-gin", 2 + Math.floor(r() * 4)); add("p-fritas", 1);
      } else {
        const k = 1 + Math.floor(r() * 4);
        for (let i = 0; i < k; i++) add(pickProduct(), 1 + Math.floor(r() * 2));
      }
    }
  }

  // próximos eventos da vitrine (outras casas e datas)
  const at = (days: number, hour: number) => { const d = new Date(upcoming.getTime() - 3 * 36e5); d.setUTCDate(d.getUTCDate() + days); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour + 3)).toISOString(); };
  const extra: [string, string, string, string, number, number, EventItem["category"], string, number, number][] = [
    ["baile-neon", "Baile Neon", "venue-2", "/posters/baile-neon.jpg", 1, 23, "Festas", "DJ Kalu, MC Vitória e um B2B surpresa. Pista única, som de galpão.", 5000, 12000],
    ["samba-no-quintal", "Samba no Quintal", "venue-3", "/posters/samba-no-quintal.jpg", 2, 16, "Shows", "Roda de samba ao ar livre com feijoada até as 19h.", 4000, 9000],
    ["subsolo-techno", "Subsolo", "venue-2", "/posters/subsolo-techno.jpg", 6, 23, "Festas", "Techno a noite toda, das 23h às 7h. Ayla, Renzo e Kørt.", 6000, 0],
    ["sexta-sertaneja", "Sexta Sertaneja", "venue-1", "/posters/sexta-sertaneja.jpg", 7, 22, "Shows", "João & Rafa ao vivo. Camarotes limitados.", 7000, 18000],
    ["pagode-de-mesa", "Pagode de Mesa", "venue-3", "/posters/pagode-de-mesa.jpg", 8, 18, "Barzinho", "Grupo Roda de Amigos. Reserve sua mesa para até 6 pessoas.", 3000, 25000],
  ];
  extra.forEach(([slug, name, vid, cover, days, hour, category, description, pista, vip], i) => {
    const id = `ev-x${i}`;
    events.push({ id, venue_id: vid, slug, name, starts_at: at(days, hour), capacity: 800, cover_color: "#000", cover_url: cover, category, description, min_age: 18 });
    ticket_types.push({ id: `tt-x${i}-pista`, event_id: id, name: category === "Barzinho" ? "Entrada" : "Pista · 1º lote", price_cents: pista, quantity: 600, sold: 120 + i * 37 });
    if (vip) ticket_types.push({ id: `tt-x${i}-vip`, event_id: id, name: category === "Barzinho" ? "Mesa para 6" : "Camarote", price_cents: vip, quantity: 40, sold: 12 + i * 3 });
  });

  const invites: Invite[] = [];
  return { venues: [venue, galpao, quintal], events, ticket_types, customers, tickets, checkins, promoters, guest_list, products, tabs, order_items, invites };
}
