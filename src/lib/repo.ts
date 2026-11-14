/** Regras de negócio da Casa Cheia. Fala só com db() — funciona em demo e no Supabase. */
import { db, isSupabaseConfigured, uid } from "./db";
import type { Checkin, Customer, EventItem, GuestListEntry, Invite, OrderItem, Product, Promoter, Tab, Ticket, TicketType, Venue } from "./types";
import type { Dataset } from "./insights";
import { insideGeofence } from "./geo";
import { getSession, unseal } from "./admin-auth";
import { getPlan, ticketTotals, type FeeMode } from "./plans";
import { cancelCharge, getPayment, isPaidStatus, platformCfg, testPayments, type AsaasCfg, type AsaasPayment } from "./payments";
import { creditSale, debitRefund } from "./payouts";

const randomSeed = () => {
  const b = new Uint8Array(isSupabaseConfigured() ? 24 : 10); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
};

export class SetupRequired extends Error { constructor() { super("Configuração pendente: cadastre a casa em /admin/setup."); } }

/** Tira os segredos da casa (senha e chave do Asaas) antes de sair do servidor. */
function clean(v: Venue): Venue {
  const { password_hash: _p, asaas_key_enc, ...rest } = v;
  return { ...rest, has_asaas: Boolean(asaas_key_enc) };
}
const byAge = (a: Venue, b: Venue) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id);

/** Casa com os segredos. Use só para login e pagamentos. */
export const venueRaw = (id: string) => db().get<Venue>("venues", id);
export async function venueRawByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return (await db().select<Venue>("venues")).find((v) => (v.owner_email ?? "").toLowerCase() === e) ?? null;
}
export async function listVenues(): Promise<Venue[]> {
  return (await db().select<Venue>("venues")).sort(byAge).map(clean);
}
export async function getVenueById(id: string) {
  const v = await db().get<Venue>("venues", id);
  return v ? clean(v) : null;
}

/** Casa do painel aberto (sessão). Exige configuração feita. */
export async function getVenue(): Promise<Venue> {
  const v = await getVenueOrNull();
  if (!v) throw new SetupRequired();
  return v;
}
/**
 * Casa da sessão atual: a que fez login no painel. No modo demo, a primeira.
 * A Casa Cheia (root) sem casa escolhida cai na mais antiga.
 */
export async function getVenueOrNull(): Promise<Venue | null> {
  if (!isSupabaseConfigured()) return (await listVenues())[0] ?? null;
  const s = await getSession();
  if (!s) return null;
  if (s.venueId) return getVenueById(s.venueId);
  return s.root ? (await listVenues())[0] ?? null : null;
}
export async function getVenueBySlug(slug: string) {
  const [v] = await db().select<Venue>("venues", { slug });
  return v ? clean(v) : null;
}

// ---------------------------------------------------------------- plano e pagamentos da casa
export type PayMode = { kind: "asaas"; cfg: AsaasCfg; custody: boolean } | { kind: "teste" } | { kind: "off" };
/**
 * Como a casa recebe:
 * - conta Asaas própria (a casa colou a chave): o Pix cai na conta dela e a taxa sai pelo split;
 * - pela plataforma (custody): o Pix cai na conta da Casa Cheia e o saldo é repassado à chave Pix da casa;
 * - teste (demo): aprova na hora; desligado: produção sem nenhuma conta, não vende ingresso pago.
 */
export async function payMode(venueId: string | null | undefined): Promise<PayMode> {
  const v = venueId ? await venueRaw(venueId) : null;
  const key = unseal(v?.asaas_key_enc);
  if (key) return { kind: "asaas", cfg: { apiKey: key }, custody: false };
  const platform = platformCfg();
  if (platform && isSupabaseConfigured() && !testPayments()) return { kind: "asaas", cfg: platform, custody: true };
  return !isSupabaseConfigured() || testPayments() ? { kind: "teste" } : { kind: "off" };
}

/**
 * Pagamento confirmado no Asaas: libera o ingresso (ou fecha a comanda) e, quando o
 * dinheiro caiu na conta da plataforma, credita a parte da casa no extrato.
 */
export async function confirmPayment(kind: "ticket" | "tab", refId: string, payment: AsaasPayment, mode: PayMode) {
  if (kind === "ticket") await markTicketPaid(refId);
  else await db().transition<Tab>("tabs", refId, ["open"], { status: "paid", payment_id: payment.id });
  if (mode.kind !== "asaas" || !mode.custody) return;
  const row = kind === "ticket" ? await db().get<Ticket>("tickets", refId) : await db().get<Tab>("tabs", refId);
  const ev = row ? await db().get<EventItem>("events", row.event_id) : null;
  if (!row || !ev) return;
  await creditSale({
    venueId: ev.venue_id, kind, payment, note: kind === "ticket" ? `Ingresso · ${ev.name}` : `Comanda · ${(row as Tab).table_label}`,
    platformFeeCents: kind === "ticket" ? (row as Ticket).fee_cents ?? 0 : 0,
  });
}

/** Estorno de uma cobrança feita pela conta da plataforma: tira do saldo da casa. */
export async function chargeBackToVenue(paymentId: string, mode: PayMode) {
  if (mode.kind === "asaas" && mode.custody) await debitRefund(paymentId);
}
export const venuePlan = (v: Pick<Venue, "plan"> | null | undefined) => getPlan(v?.plan);
export const venueFeeMode = (v: Pick<Venue, "fee_mode"> | null | undefined): FeeMode => (v?.fee_mode === "venue" ? "venue" : "buyer");
export async function venueOfEvent(eventId: string) {
  const e = await db().get<EventItem>("events", eventId);
  return e ? getVenueById(e.venue_id) : null;
}
/** O evento é da casa da sessão? (toda alteração do painel passa por aqui) */
export async function ownedEvent(eventId: string): Promise<EventItem | null> {
  const [v, e] = await Promise.all([getVenueOrNull(), db().get<EventItem>("events", eventId)]);
  return v && e && e.venue_id === v.id ? e : null;
}

export async function listEvents(venueId?: string): Promise<EventItem[]> {
  return (await db().select<EventItem>("events", venueId ? { venue_id: venueId } : undefined)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
/** Próximo evento (ou o que está acontecendo agora). */
/** Sem `venueId`, usa a casa da sessão do painel. Rotas públicas passam a casa. */
export async function currentEvent(venueId?: string): Promise<EventItem | null> {
  const now = Date.now() - 8 * 36e5; // considera "atual" até 8h após o início
  const id = venueId ?? (await getVenueOrNull())?.id;
  if (!id) return null;
  return (await listEvents(id)).find((e) => new Date(e.starts_at).getTime() >= now) ?? null;
}

/** Vitrine: próximos eventos de todas as casas, com casa e menor preço. */
export async function upcomingShowcase() {
  const now = Date.now() - 6 * 36e5;
  const [events, venues, types] = await Promise.all([listEvents(), listVenues(), db().select<TicketType>("ticket_types")]);
  const vById = new Map(venues.filter((v) => v.plan_status !== "blocked").map((v) => [v.id, v]));
  return events.filter((e) => vById.has(e.venue_id) && new Date(e.starts_at).getTime() >= now).map((e) => {
    const t = types.filter((x) => x.event_id === e.id);
    const open = t.filter((x) => x.sold < x.quantity);
    return { ...e, venue: vById.get(e.venue_id) ?? null, fromCents: open.length ? Math.min(...open.map((x) => x.price_cents)) : null, soldOut: t.length > 0 && open.length === 0 };
  });
}
export async function getEventBySlug(slug: string) {
  const [e] = await db().select<EventItem>("events", { slug });
  if (!e) return null;
  return { ...e, venue: await getVenueById(e.venue_id) };
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
  try {
    return await issueReservedTicket(input, tt);
  } catch (e) {
    await db().adjustSold(tt.id, -1); // devolve a vaga reservada
    throw e;
  }
}

async function issueReservedTicket(input: { eventId: string; name: string; phone: string; cpf?: string | null; promoterId?: string | null; free?: boolean }, tt: TicketType) {
  const customer = await findOrCreateCustomer(input.name, input.phone, input.cpf);
  const venue = await venueOfEvent(input.eventId);
  // indicação de promoter: só vale se o promoter existir, estiver ativo e for da mesma casa
  const promoter = input.promoterId ? await db().get<Promoter>("promoters", input.promoterId) : null;
  input.promoterId = promoter && promoter.active !== false && (!promoter.venue_id || promoter.venue_id === venue?.id) ? promoter.id : null;
  const totals = ticketTotals(input.free ? 0 : tt.price_cents, venuePlan(venue), venueFeeMode(venue));
  const ticket: Ticket = {
    id: uid(), event_id: input.eventId, ticket_type_id: tt.id, customer_id: customer.id, promoter_id: input.promoterId ?? null,
    status: input.free ? "paid" : "pending", qr_seed: randomSeed(), price_cents: input.free ? 0 : tt.price_cents, fee_cents: totals.feeCents, is_free: !!input.free, created_at: new Date().toISOString(),
  };
  await db().insert("tickets", ticket as Ticket);
  if (input.promoterId) {
    const [already] = await db().select<GuestListEntry>("guest_list", { event_id: input.eventId, customer_id: customer.id });
    if (!already) await db().insert<GuestListEntry>("guest_list", { id: uid(), event_id: input.eventId, promoter_id: input.promoterId, customer_id: customer.id, status: "pending", validated_at: null });
  }
  return { ticket, customer, ticketType: tt, venue, chargeCents: totals.buyerCents };
}

/** Pagamento confirmado. Idempotente e atômico: webhook e consulta ao mesmo tempo não contam a vaga duas vezes. */
export async function markTicketPaid(ticketId: string) {
  const paid = await db().transition<Ticket>("tickets", ticketId, ["pending"], { status: "paid" });
  if (paid) return paid;
  const t = await db().get<Ticket>("tickets", ticketId);
  if (t?.status === "cancelled" && t.payment_id && !/^(teste|free)-/.test(t.payment_id)) {
    // o Pix foi pago depois de o ingresso ter sido liberado: quem pagou não pode ficar sem ingresso.
    // A vaga volta a contar (o lote pode passar 1 ou 2 da quantidade nesse caso raro).
    const back = await db().transition<Ticket>("tickets", ticketId, ["cancelled"], { status: "paid" });
    if (back) { await db().adjustSold(t.ticket_type_id, 1); console.warn("[ingresso] pago depois de cancelado, reativado:", ticketId); }
    return back ?? (await db().get<Ticket>("tickets", ticketId));
  }
  return t;
}

/** Estorno ou exclusão feitos direto no Asaas: o ingresso deixa de valer e a vaga volta. */
export async function markTicketRefunded(ticketId: string) {
  const t = await db().transition<Ticket>("tickets", ticketId, ["paid", "pending"], { status: "refunded", refunded_at: new Date().toISOString() });
  if (t) await db().adjustSold(t.ticket_type_id, -1);
  return t;
}

/** Cancela ingresso não pago e devolve a vaga ao lote. */
export async function releaseTicket(ticketId: string) {
  const t = await db().transition<Ticket>("tickets", ticketId, ["pending"], { status: "cancelled" });
  if (t) await db().adjustSold(t.ticket_type_id, -1);
}

export const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Libera a vaga de ingressos com Pix não pago há mais de 30 minutos.
 * Antes, confere no Asaas: se já foi pago, confirma o ingresso; se não, apaga a
 * cobrança (o QR Code deixa de valer) e só então libera a vaga. Se o Asaas não
 * responder, deixa para a próxima rodada, para não cancelar um Pix que pode estar pago.
 * Roda a cada tentativa de compra do evento e na rotina diária.
 */
export async function releaseStalePending(opts: { maxAgeMs?: number; eventId?: string } = {}) {
  const maxAge = opts.maxAgeMs ?? PENDING_MAX_AGE_MS;
  const pend = (await db().select<Ticket>("tickets", opts.eventId ? { status: "pending", event_id: opts.eventId } : { status: "pending" }))
    .filter((t) => Date.now() - new Date(t.created_at).getTime() > maxAge);
  let released = 0;
  for (const t of pend) {
    if (t.payment_id && !/^(teste|free)-/.test(t.payment_id)) {
      const mode = await payMode((await db().get<EventItem>("events", t.event_id))?.venue_id);
      if (mode.kind === "asaas") {
        try {
          const p = await getPayment(mode.cfg, t.payment_id);
          if (isPaidStatus(p.status, p.billingType)) { await confirmPayment("ticket", t.id, p, mode); continue; }
          if (p.status !== "REFUNDED" && !(p as { deleted?: boolean }).deleted) await cancelCharge(mode.cfg, t.payment_id);
        } catch (e) { console.error("[liberar ingresso]", t.id, e); continue; }
      }
    }
    await releaseTicket(t.id);
    released++;
  }
  return released;
}

/** Aplica um pagamento confirmado pela referência externa (ticket:ID ou tab:ID). */
/**
 * Só aplica se a cobrança for a que o próprio app gerou para aquele ingresso ou
 * comanda E se ele for da casa dona do webhook: uma casa não consegue quitar o
 * ingresso de outra apontando a referência.
 */
/**
 * Aplica um evento de pagamento vindo do webhook. `hookVenueId` é a casa dona da conta Asaas
 * do webhook; null quando o webhook é o da conta da plataforma (aí a cobrança precisa ser de
 * uma casa que recebe pela plataforma). Só vale para a cobrança que o próprio app gerou.
 */
export async function applyPaymentRef(payment: AsaasPayment, mode: PayMode, hookVenueId: string | null, outcome: "paid" | "refunded" | "deleted" = "paid") {
  if (!payment.externalReference || mode.kind !== "asaas") return null;
  const [kind, ref] = payment.externalReference.split(":");
  const mine = async (eventId: string) => {
    const venueId = (await db().get<EventItem>("events", eventId))?.venue_id;
    if (!venueId) return false;
    if (hookVenueId) return venueId === hookVenueId;
    const m = await payMode(venueId);
    return m.kind === "asaas" && m.custody;
  };
  // a cobrança veio da conta certa; payment_id vazio = o processo caiu antes de gravá-lo
  const same = (current: string | null | undefined) => !current || current === payment.id;
  if (kind === "ticket") {
    const t = await db().get<Ticket>("tickets", ref);
    if (!t || !same(t.payment_id) || !(await mine(t.event_id))) return null;
    if (!t.payment_id) await db().update<Ticket>("tickets", ref, { payment_id: payment.id });
    if (outcome === "paid") await confirmPayment("ticket", ref, payment, mode);
    else if (outcome === "refunded") { await markTicketRefunded(ref); await chargeBackToVenue(payment.id, mode); }
    else await releaseTicket(ref);
    return "ticket";
  }
  if (kind === "tab") {
    const t = await db().get<Tab>("tabs", ref);
    if (!t || !same(t.payment_id) || !(await mine(t.event_id))) return null;
    if (outcome === "paid") await confirmPayment("tab", ref, payment, mode);
    else if (outcome === "refunded") await chargeBackToVenue(payment.id, mode);
    else if (outcome === "deleted" && t.payment_id === payment.id) await db().update<Tab>("tabs", ref, { payment_id: null });
    return "tab";
  }
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
  const venue = event ? await getVenueById(event.venue_id) : null;
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
  const valid = new Set((await db().select<Ticket>("tickets", { event_id: eventId })).filter((t) => t.status === "paid" || t.status === "used").map((t) => t.id));
  const results: { ticketId: string; status: "ok" | "duplicado" | "invalido" }[] = [];
  for (const it of items) {
    if (existing.has(it.ticketId)) { results.push({ ticketId: it.ticketId, status: "duplicado" }); continue; }
    if (!valid.has(it.ticketId)) { results.push({ ticketId: it.ticketId, status: "invalido" }); continue; } // de outro evento, não pago, cancelado ou estornado
    existing.add(it.ticketId);
    try {
      await db().insert<Checkin>("checkins", { id: uid(), ticket_id: it.ticketId, event_id: eventId, gate: it.gate, at: it.at, offline: it.offline });
    } catch { results.push({ ticketId: it.ticketId, status: "duplicado" }); continue; } // outra portaria registrou no mesmo instante
    const t = await db().transition<Ticket>("tickets", it.ticketId, ["paid"], { status: "used" });
    // se o ingresso veio de promoter, marca o convidado como presente
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
    venueOfEvent(eventId),
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

/** Promoters da casa da sessão (ou da casa informada). */
export async function listPromoters(venueId?: string): Promise<Promoter[]> {
  const id = venueId ?? (await getVenueOrNull())?.id;
  return id ? db().select<Promoter>("promoters", { venue_id: id }) : [];
}

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
  const venue = await venueOfEvent(entry.event_id);
  if (!venue) throw new Error("Evento não encontrado.");
  const geo = insideGeofence(point, venue);
  if (!geo.inside) return { ok: false as const, ...geo };
  await db().update<GuestListEntry>("guest_list", entryId, { status: "inside", validated_at: new Date().toISOString() });
  return { ok: true as const, ...geo };
}

// ---------------------------------------------------------------- cardápio / comandas
export async function listProducts(venueId: string): Promise<Product[]> {
  const now = Date.now();
  return (await db().select<Product>("products", { venue_id: venueId })).filter((p) => p.active).map((p) => ({
    ...p,
    promo_price_cents: p.promo_price_cents && p.promo_until && new Date(p.promo_until).getTime() > now ? p.promo_price_cents : null,
  }));
}

export async function openOrAddToTab(input: { tabId?: string | null; eventId: string; table: string; name: string; phone: string; items: { productId: string; qty: number }[] }) {
  if (!input.items.length) throw new Error("Carrinho vazio");
  let tab = input.tabId ? await db().get<Tab>("tabs", input.tabId) : null;
  if (tab?.status === "open" && tab.payment_id && !/^(teste|free)-/.test(tab.payment_id)) {
    // há um Pix gerado para o total antigo: apaga para o cliente não pagar menos do que consumiu
    const venueId = (await db().get<EventItem>("events", tab.event_id))?.venue_id;
    const mode = await payMode(venueId);
    if (mode.kind === "asaas") {
      const p = await getPayment(mode.cfg, tab.payment_id);
      if (isPaidStatus(p.status, p.billingType)) {
        await confirmPayment("tab", tab.id, p, mode);
        tab = null; // já pago: os itens novos vão para uma comanda nova
      } else {
        await cancelCharge(mode.cfg, tab.payment_id).catch((e) => console.error("[comanda] apagar Pix", e));
        tab = (await db().update<Tab>("tabs", tab.id, { payment_id: null })) ?? tab;
      }
    }
  }
  if (!tab || tab.status !== "open") {
    const customer = await findOrCreateCustomer(input.name || "Cliente", input.phone || `anon-${uid().slice(0, 8)}`);
    tab = { id: uid(), event_id: input.eventId, customer_id: customer.id, table_label: input.table, status: "open", opened_at: new Date().toISOString() };
    await db().insert("tabs", tab);
  }
  const ev = await db().get<EventItem>("events", tab.event_id);
  const products = new Map((ev ? await listProducts(ev.venue_id) : []).map((p) => [p.id, p]));
  const rows: OrderItem[] = [];
  for (const it of input.items) {
    const p = products.get(it.productId);
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1)) continue;
    it.qty = Math.min(qty, 50);
    rows.push({ id: uid(), tab_id: tab.id, event_id: tab.event_id, product_id: p.id, qty: it.qty, unit_price_cents: p.promo_price_cents ?? p.price_cents, status: "queued", created_at: new Date().toISOString() });
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
export const listInvites = (eventId: string) => db().select<Invite>("invites", { event_id: eventId });

// ---------------------------------------------------------------- analytics
/** Dados da casa para a análise. Clientes são da plataforma; aqui entram só os que passaram pela casa. */
export async function loadDataset(venueId?: string): Promise<Dataset> {
  const d = db();
  const id = venueId ?? (await getVenueOrNull())?.id;
  if (!id) return { events: [], customers: [], tickets: [], checkins: [], tabs: [], order_items: [], products: [] };
  const [events, customers, tickets, checkins, tabs, order_items, products] = await Promise.all([
    d.select<EventItem>("events", { venue_id: id }), d.select<Customer>("customers"), d.select<Ticket>("tickets"),
    d.select<Checkin>("checkins"), d.select<Tab>("tabs"), d.select<OrderItem>("order_items"), d.select<Product>("products", { venue_id: id }),
  ]);
  const ev = new Set(events.map((e) => e.id));
  const mine = <T extends { event_id: string }>(rows: T[]) => rows.filter((r) => ev.has(r.event_id));
  const t = mine(tickets), tb = mine(tabs);
  const seen = new Set([...t.map((x) => x.customer_id), ...tb.map((x) => x.customer_id)]);
  return { events, customers: customers.filter((c) => seen.has(c.id)), tickets: t, checkins: mine(checkins), tabs: tb, order_items: mine(order_items), products };
}

export async function liveStats(eventId: string) {
  const ds = await loadDataset((await db().get<EventItem>("events", eventId))?.venue_id);
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

/**
 * Conciliação diária do recebimento pela plataforma: ingresso ou comanda pagos nos
 * últimos 7 dias cuja venda não entrou no extrato (webhook perdido, por exemplo).
 */
export async function reconcileCustody() {
  const platform = platformCfg();
  if (!platform) return { checked: 0, credited: 0 };
  const since = Date.now() - 7 * 864e5;
  const credited = new Set([...(await db().select<{ id: string; ref: string }>("ledger")).map((e) => e.ref)]);
  const tickets = (await db().select<Ticket>("tickets")).filter((t) => (t.status === "paid" || t.status === "used") && t.payment_id && !/^(teste|free)-/.test(t.payment_id) && !credited.has(t.payment_id) && new Date(t.created_at).getTime() > since);
  const tabs = (await db().select<Tab>("tabs", { status: "paid" })).filter((t) => t.payment_id && !/^(teste|free)-/.test(t.payment_id) && !credited.has(t.payment_id) && new Date(t.opened_at).getTime() > since);
  let n = 0;
  for (const [kind, row] of [...tickets.map((t) => ["ticket", t] as const), ...tabs.map((t) => ["tab", t] as const)]) {
    const ev = await db().get<EventItem>("events", row.event_id);
    const mode = await payMode(ev?.venue_id);
    if (mode.kind !== "asaas" || !mode.custody) continue;
    try {
      const p = await getPayment(mode.cfg, row.payment_id!);
      if (isPaidStatus(p.status, p.billingType)) { await confirmPayment(kind, row.id, p, mode); n++; }
    } catch (e) { console.error("[conciliação]", row.id, e); }
  }
  return { checked: tickets.length + tabs.length, credited: n };
}
