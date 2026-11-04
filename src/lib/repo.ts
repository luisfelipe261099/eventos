/** Regras de negócio da VipFlow. Fala só com db() — funciona em demo e no Supabase. */
import { db, isSupabaseConfigured, uid } from "./db";
import type { Checkin, Customer, EventItem, GuestListEntry, Invite, OrderItem, Product, Promoter, Tab, Ticket, TicketType, Venue } from "./types";
import type { Dataset } from "./insights";
import { insideGeofence } from "./geo";

const randomSeed = () => {
  const b = new Uint8Array(isSupabaseConfigured() ? 24 : 10); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
};

export class SetupRequired extends Error { constructor() { super("Configuração pendente: cadastre a casa em /admin/setup."); } }

export async function getVenue(): Promise<Venue> {
  const v = await getVenueOrNull();
  if (!v) throw new SetupRequired();
  return v;
}
export async function getVenueOrNull(): Promise<Venue | null> {
  const vs = await db().select<Venue>("venues");
  return vs.sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}
export async function getVenueBySlug(slug: string) {
  const [v] = await db().select<Venue>("venues", { slug });
  return v ?? null;
}

export async function listEvents(): Promise<EventItem[]> {
  return (await db().select<EventItem>("events")).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
/** Próximo evento (ou o que está acontecendo agora). */
export async function currentEvent(): Promise<EventItem | null> {
  const now = Date.now() - 8 * 36e5; // considera "atual" até 8h após o início
  const venue = await getVenueOrNull();
  if (!venue) return null;
  return (await listEvents()).find((e) => e.venue_id === venue.id && new Date(e.starts_at).getTime() >= now) ?? null;
}

/** Vitrine: próximos eventos de todas as casas, com casa e menor preço. */
export async function upcomingShowcase() {
  const now = Date.now() - 6 * 36e5;
  const [events, venues, types] = await Promise.all([listEvents(), db().select<Venue>("venues"), db().select<TicketType>("ticket_types")]);
  const vById = new Map(venues.map((v) => [v.id, v]));
  return events.filter((e) => new Date(e.starts_at).getTime() >= now).map((e) => {
    const t = types.filter((x) => x.event_id === e.id);
    const open = t.filter((x) => x.sold < x.quantity);
    return { ...e, venue: vById.get(e.venue_id) ?? null, fromCents: open.length ? Math.min(...open.map((x) => x.price_cents)) : null, soldOut: t.length > 0 && open.length === 0 };
  });
}
export async function getEventBySlug(slug: string) {
  const [e] = await db().select<EventItem>("events", { slug });
  if (!e) return null;
  return { ...e, venue: await db().get<Venue>("venues", e.venue_id) };
}
export const getTicketTypes = (eventId: string) => db().select<TicketType>("ticket_types", { event_id: eventId });

export async function findOrCreateCustomer(name: string, phone: string, cpf?: string | null): Promise<Customer> {
  const digits = cpf ? cpf.replace(/\D/g, "") : null;
  const [c] = await db().select<Customer>("customers", { phone });
  if (c) {
    if (digits && c.cpf !== digits) return (await db().update<Customer>("customers", c.id, { cpf: digits, asaas_id: null })) ?? c;
    return c;
  }
  const [created] = await db().insert<Customer>("customers", { id: uid(), name, phone, ...(digits ? { cpf: digits } : {}) });
  return created;
}

export async function createTicket(input: { eventId: string; ticketTypeId: string; name: string; phone: string; cpf?: string | null; promoterId?: string | null; free?: boolean }) {
  const tt = await db().get<TicketType>("ticket_types", input.ticketTypeId);
  if (!tt || tt.event_id !== input.eventId) throw new Error("Tipo de ingresso inválido");
  if (!(await db().reserveTicket(tt.id))) throw new Error("Este lote esgotou. Escolha outro ingresso.");
  const customer = await findOrCreateCustomer(input.name, input.phone, input.cpf);
  // indicação de promoter: só vale se o promoter existir e estiver ativo
  const promoter = input.promoterId ? await db().get<Promoter>("promoters", input.promoterId) : null;
  input.promoterId = promoter && promoter.active !== false ? promoter.id : null;
  const ticket: Ticket = {
    id: uid(), event_id: input.eventId, ticket_type_id: tt.id, customer_id: customer.id, promoter_id: input.promoterId ?? null,
    status: input.free ? "paid" : "pending", qr_seed: randomSeed(), price_cents: input.free ? 0 : tt.price_cents, is_free: !!input.free, created_at: new Date().toISOString(),
  };
  await db().insert("tickets", ticket as Ticket);
  if (input.promoterId) {
    const [already] = await db().select<GuestListEntry>("guest_list", { event_id: input.eventId, customer_id: customer.id });
    if (!already) await db().insert<GuestListEntry>("guest_list", { id: uid(), event_id: input.eventId, promoter_id: input.promoterId, customer_id: customer.id, status: "pending", validated_at: null });
  }
  return { ticket, customer, ticketType: tt };
}

export async function markTicketPaid(ticketId: string) {
  const t = await db().get<Ticket>("tickets", ticketId);
  if (!t || t.status !== "pending") return t; // idempotente: webhook pode chegar repetido
  return db().update<Ticket>("tickets", ticketId, { status: "paid" });
}

/** Cancela ingresso não pago e devolve a vaga ao lote. */
export async function releaseTicket(ticketId: string) {
  const t = await db().get<Ticket>("tickets", ticketId);
  if (!t || t.status !== "pending") return;
  await db().update<Ticket>("tickets", ticketId, { status: "cancelled" });
  const tt = await db().get<TicketType>("ticket_types", t.ticket_type_id);
  if (tt && tt.sold > 0) await db().update<TicketType>("ticket_types", tt.id, { sold: tt.sold - 1 });
}

/** Libera ingressos com Pix não pago há mais de 2 horas. */
export async function releaseStalePending(maxAgeMs = 2 * 36e5) {
  const pend = (await db().select<Ticket>("tickets", { status: "pending" })).filter((t) => Date.now() - new Date(t.created_at).getTime() > maxAgeMs);
  for (const t of pend) await releaseTicket(t.id);
  return pend.length;
}

/** Aplica um pagamento confirmado pela referência externa (ticket:ID ou tab:ID). */
export async function applyPaymentRef(externalRef: string | null | undefined) {
  if (!externalRef) return null;
  const [kind, ref] = externalRef.split(":");
  if (kind === "ticket") { await markTicketPaid(ref); return "ticket"; }
  if (kind === "tab") { await db().update<Tab>("tabs", ref, { status: "paid" }); return "tab"; }
  return null;
}

export async function getTicketFull(id: string) {
  const ticket = await db().get<Ticket>("tickets", id);
  if (!ticket) return null;
  const [event, customer, ticketType] = await Promise.all([
    db().get<EventItem>("events", ticket.event_id),
    db().get<Customer>("customers", ticket.customer_id),
    db().get<TicketType>("ticket_types", ticket.ticket_type_id),
  ]);
  const venue = event ? await db().get<Venue>("venues", event.venue_id) : null;
  return { ticket, event, customer, ticketType, venue };
}

/** Lista que a portaria baixa ANTES do evento para validar offline. */
export async function doorManifest(eventId: string) {
  const [tickets, customers, checkins] = await Promise.all([
    db().select<Ticket>("tickets", { event_id: eventId }),
    db().select<Customer>("customers"),
    db().select<Checkin>("checkins", { event_id: eventId }),
  ]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const used = new Set(checkins.map((c) => c.ticket_id));
  return tickets
    .filter((t) => t.status === "paid" || t.status === "used")
    .map((t) => ({ id: t.id, seed: t.qr_seed, holder: names.get(t.customer_id) ?? "Convidado", used: used.has(t.id) }));
}

/** Recebe check-ins feitos (inclusive offline) e grava sem duplicar. */
export async function syncCheckins(eventId: string, items: { ticketId: string; at: string; gate: string; offline: boolean }[]) {
  const existing = new Set((await db().select<Checkin>("checkins", { event_id: eventId })).map((c) => c.ticket_id));
  const results: { ticketId: string; status: "ok" | "duplicado" }[] = [];
  for (const it of items) {
    if (existing.has(it.ticketId)) { results.push({ ticketId: it.ticketId, status: "duplicado" }); continue; }
    existing.add(it.ticketId);
    await db().insert<Checkin>("checkins", { id: uid(), ticket_id: it.ticketId, event_id: eventId, gate: it.gate, at: it.at, offline: it.offline });
    await db().update<Ticket>("tickets", it.ticketId, { status: "used" });
    // se o ingresso veio de promoter, marca o convidado como presente
    const t = await db().get<Ticket>("tickets", it.ticketId);
    if (t?.promoter_id) {
      const [gl] = await db().select<GuestListEntry>("guest_list", { event_id: eventId, customer_id: t.customer_id });
      if (gl) await db().update<GuestListEntry>("guest_list", gl.id, { status: "inside", validated_at: it.at });
    }
    results.push({ ticketId: it.ticketId, status: "ok" });
  }
  return results;
}

// ---------------------------------------------------------------- promoter
export async function promoterView(promoterId: string, eventId: string) {
  const [promoter, list, customers, venue] = await Promise.all([
    db().get<Promoter>("promoters", promoterId),
    db().select<GuestListEntry>("guest_list", { event_id: eventId, promoter_id: promoterId }),
    db().select<Customer>("customers"),
    getVenue(),
  ]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const inside = list.filter((g) => g.status === "inside").length;
  return {
    promoter, venue,
    guests: list.map((g) => ({ ...g, name: names.get(g.customer_id) ?? "Convidado" })),
    inside, total: list.length,
    commissionCents: inside * (promoter?.commission_cents ?? 0),
  };
}

export const listPromoters = () => db().select<Promoter>("promoters");

/** Promoter pelo código do link individual (/promoter?k=...). */
export async function promoterByCode(code: string | null | undefined): Promise<Promoter | null> {
  if (!code) return null;
  const [p] = await db().select<Promoter>("promoters", { access_code: code });
  const found = p ?? (isSupabaseConfigured() ? null : await db().get<Promoter>("promoters", code));
  return found && found.active !== false ? found : null;
}

export async function addGuest(promoterId: string, eventId: string, name: string, phone: string) {
  const customer = await findOrCreateCustomer(name, phone);
  const entry: GuestListEntry = { id: uid(), event_id: eventId, promoter_id: promoterId, customer_id: customer.id, status: "pending", validated_at: null };
  await db().insert("guest_list", entry as GuestListEntry);
  return entry;
}

/** Promoter confirma presença do convidado: só vale dentro do raio da casa. */
export async function promoterGeoCheckin(promoterId: string, entryId: string, point: { lat: number; lng: number; accuracy?: number }) {
  const entry = await db().get<GuestListEntry>("guest_list", entryId);
  if (!entry || entry.promoter_id !== promoterId) throw new Error("Este convidado não está na sua lista.");
  const venue = await getVenue();
  const geo = insideGeofence(point, venue);
  if (!geo.inside) return { ok: false as const, ...geo };
  await db().update<GuestListEntry>("guest_list", entryId, { status: "inside", validated_at: new Date().toISOString() });
  return { ok: true as const, ...geo };
}

// ---------------------------------------------------------------- cardápio / comandas
export async function listProducts(): Promise<Product[]> {
  const now = Date.now();
  return (await db().select<Product>("products")).filter((p) => p.active).map((p) => ({
    ...p,
    promo_price_cents: p.promo_price_cents && p.promo_until && new Date(p.promo_until).getTime() > now ? p.promo_price_cents : null,
  }));
}

export async function openOrAddToTab(input: { tabId?: string | null; eventId: string; table: string; name: string; phone: string; items: { productId: string; qty: number }[] }) {
  if (!input.items.length) throw new Error("Carrinho vazio");
  let tab = input.tabId ? await db().get<Tab>("tabs", input.tabId) : null;
  if (!tab || tab.status !== "open") {
    const customer = await findOrCreateCustomer(input.name || "Cliente", input.phone || `anon-${uid().slice(0, 8)}`);
    tab = { id: uid(), event_id: input.eventId, customer_id: customer.id, table_label: input.table, status: "open", opened_at: new Date().toISOString() };
    await db().insert("tabs", tab);
  }
  const products = new Map((await listProducts()).map((p) => [p.id, p]));
  const rows: OrderItem[] = [];
  for (const it of input.items) {
    const p = products.get(it.productId);
    if (!p || it.qty < 1) continue;
    rows.push({ id: uid(), tab_id: tab.id, event_id: tab.event_id, product_id: p.id, qty: Math.min(it.qty, 50), unit_price_cents: p.promo_price_cents ?? p.price_cents, status: "queued", created_at: new Date().toISOString() });
    await db().update<Product>("products", p.id, { stock: Math.max(0, p.stock - it.qty) });
  }
  await db().insert("order_items", rows as (OrderItem)[]);
  return tab;
}

export async function getTab(tabId: string) {
  const tab = await db().get<Tab>("tabs", tabId);
  if (!tab) return null;
  const [items, products] = await Promise.all([db().select<OrderItem>("order_items", { tab_id: tabId }), db().select<Product>("products")]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const lines = items.map((i) => ({ ...i, name: names.get(i.product_id) ?? "Item" })).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const subtotal = lines.filter((l) => l.status !== "cancelled").reduce((s, l) => s + l.qty * l.unit_price_cents, 0);
  const service = Math.round(subtotal * 0.1);
  return { tab, lines, subtotal, service, total: subtotal + service };
}

export async function liveOrders(eventId: string) {
  const [items, products, tabs] = await Promise.all([
    db().select<OrderItem>("order_items", { event_id: eventId }),
    db().select<Product>("products"),
    db().select<Tab>("tabs", { event_id: eventId }),
  ]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const tabById = new Map(tabs.map((t) => [t.id, t]));
  return items.filter((i) => i.status === "queued" || i.status === "preparing" || i.status === "ready")
    .map((i) => ({ ...i, name: names.get(i.product_id) ?? "Item", table: tabById.get(i.tab_id)?.table_label ?? "-" }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const setOrderStatus = (id: string, status: OrderItem["status"]) => db().update<OrderItem>("order_items", id, { status });

export async function setPromo(productId: string, promoCents: number, hours = 4) {
  return db().update<Product>("products", productId, { promo_price_cents: promoCents, promo_until: new Date(Date.now() + hours * 36e5).toISOString() });
}

export async function saveInvite(inv: Omit<Invite, "id" | "created_at">) {
  const row: Invite = { ...inv, id: uid(), created_at: new Date().toISOString() };
  await db().insert("invites", row as Invite);
  return row;
}
export const listInvites = () => db().select<Invite>("invites");

// ---------------------------------------------------------------- analytics
export async function loadDataset(): Promise<Dataset> {
  const d = db();
  const [events, customers, tickets, checkins, tabs, order_items, products] = await Promise.all([
    d.select<EventItem>("events"), d.select<Customer>("customers"), d.select<Ticket>("tickets"),
    d.select<Checkin>("checkins"), d.select<Tab>("tabs"), d.select<OrderItem>("order_items"), d.select<Product>("products"),
  ]);
  return { events, customers, tickets, checkins, tabs, order_items, products };
}

export async function liveStats(eventId: string) {
  const ds = await loadDataset();
  const tickets = ds.tickets.filter((t) => t.event_id === eventId);
  const checkins = ds.checkins.filter((c) => c.event_id === eventId);
  const items = ds.order_items.filter((o) => o.event_id === eventId && o.status !== "cancelled");
  const ticketRevenue = tickets.filter((t) => t.status !== "pending" && t.status !== "cancelled").reduce((s, t) => s + t.price_cents, 0);
  const barRevenue = items.reduce((s, o) => s + o.qty * o.unit_price_cents, 0);
  const openTabs = ds.tabs.filter((t) => t.event_id === eventId && t.status === "open").length;
  const byHour = new Map<number, number>();
  for (const c of checkins) { const h = (new Date(c.at).getUTCHours() + 21) % 24; byHour.set(h, (byHour.get(h) ?? 0) + 1); }
  const hours = [22, 23, 0, 1, 2, 3, 4].map((h) => ({ h, n: byHour.get(h) ?? 0 }));
  return { sold: tickets.length, inside: checkins.length, ticketRevenue, barRevenue, openTabs, hours, ds };
}
