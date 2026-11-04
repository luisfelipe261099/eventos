/**
 * Motor de análise da VipFlow (funções puras, sem custo de IA).
 *
 * A "inteligência" de negócio é calculada aqui com regras e estatística
 * simples sobre os dados reais da casa. O modelo de linguagem (Gemini) entra
 * só para ESCREVER (resumos, campanhas), o que mantém o custo perto de zero
 * e o resultado auditável.
 */
import type { Checkin, Customer, EventItem, OrderItem, Product, Tab, Ticket } from "./types";
import { WEEKDAYS } from "./format";

export interface Dataset {
  events: EventItem[];
  customers: Customer[];
  tickets: Ticket[];
  checkins: Checkin[];
  tabs: Tab[];
  order_items: OrderItem[];
  products: Product[];
}

const DAY = 864e5;
/** dia da semana no fuso de São Paulo (UTC-3, sem horário de verão) */
const weekdayBR = (iso: string) => new Date(new Date(iso).getTime() - 3 * 36e5).getUTCDay();

// ------------------------------------------------------------------ clientes
export type Segment = "vip" | "potencial" | "frequente" | "em_risco" | "ocasional";

export interface CustomerProfile {
  customer: Customer;
  visits: number;
  visits90: number;
  avgSpendCents: number;
  totalSpendCents: number;
  favoriteWeekday: number | null;
  favoriteWeekdayShare: number;
  lastVisit: string | null;
  daysSinceLast: number | null;
  topProducts: { name: string; revenueCents: number }[];
  usualTable: string | null;
  segment: Segment;
  score: number;
  action: string | null;
}

export function customerProfiles(ds: Dataset, now = Date.now()): CustomerProfile[] {
  const evById = new Map(ds.events.map((e) => [e.id, e]));
  const prodById = new Map(ds.products.map((p) => [p.id, p]));
  const ticketById = new Map(ds.tickets.map((t) => [t.id, t]));
  const tabById = new Map(ds.tabs.map((t) => [t.id, t]));

  const visitsBy = new Map<string, Set<string>>(); // customer → eventIds
  for (const c of ds.checkins) {
    const t = ticketById.get(c.ticket_id);
    if (!t) continue;
    if (!visitsBy.has(t.customer_id)) visitsBy.set(t.customer_id, new Set());
    visitsBy.get(t.customer_id)!.add(c.event_id);
  }
  const spendBy = new Map<string, Map<string, number>>(); // customer → event → cents
  const prodRevBy = new Map<string, Map<string, number>>();
  const tableBy = new Map<string, Map<string, number>>();
  for (const oi of ds.order_items) {
    if (oi.status === "cancelled") continue;
    const tab = tabById.get(oi.tab_id);
    if (!tab) continue;
    const v = oi.qty * oi.unit_price_cents;
    const m = spendBy.get(tab.customer_id) ?? new Map(); m.set(oi.event_id, (m.get(oi.event_id) ?? 0) + v); spendBy.set(tab.customer_id, m);
    const pr = prodRevBy.get(tab.customer_id) ?? new Map(); pr.set(oi.product_id, (pr.get(oi.product_id) ?? 0) + v); prodRevBy.set(tab.customer_id, pr);
  }
  for (const tab of ds.tabs) {
    const m = tableBy.get(tab.customer_id) ?? new Map(); m.set(tab.table_label, (m.get(tab.table_label) ?? 0) + 1); tableBy.set(tab.customer_id, m);
  }

  const out: CustomerProfile[] = [];
  for (const customer of ds.customers) {
    const evIds = [...(visitsBy.get(customer.id) ?? [])].filter((id) => evById.has(id));
    if (evIds.length === 0) continue;
    const evs = evIds.map((id) => evById.get(id)!).filter((e) => new Date(e.starts_at).getTime() <= now + DAY);
    const visits = evs.length;
    const visits90 = evs.filter((e) => now - new Date(e.starts_at).getTime() <= 90 * DAY).length;
    const spends = [...(spendBy.get(customer.id)?.values() ?? [])];
    const totalSpendCents = spends.reduce((s, v) => s + v, 0);
    const avgSpendCents = spends.length ? Math.round(totalSpendCents / spends.length) : 0;

    const wdCount = new Array(7).fill(0);
    for (const e of evs) wdCount[weekdayBR(e.starts_at)]++;
    const max = Math.max(...wdCount);
    const favoriteWeekday = max > 0 ? wdCount.indexOf(max) : null;
    const favoriteWeekdayShare = visits ? max / visits : 0;

    const last = evs.map((e) => e.starts_at).sort().at(-1) ?? null;
    const daysSinceLast = last ? Math.max(0, Math.floor((now - new Date(last).getTime()) / DAY)) : null;

    const topProducts = [...(prodRevBy.get(customer.id) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([pid, cents]) => ({ name: prodById.get(pid)?.name ?? pid, revenueCents: cents }));
    const usualTable = [...(tableBy.get(customer.id) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    let segment: Segment = "ocasional";
    if (visits >= 3 && daysSinceLast !== null && daysSinceLast > 21) segment = "em_risco";
    else if (avgSpendCents >= 150_000 && visits90 >= 4) segment = "vip";
    else if (avgSpendCents >= 50_000 && visits90 >= 3) segment = "potencial";
    else if (visits90 >= 6) segment = "frequente";

    const score = Math.round((avgSpendCents / 100) * (0.5 + favoriteWeekdayShare) * Math.min(visits90, 12));

    let action: string | null = null;
    if ((segment === "vip" || segment === "potencial") && favoriteWeekday !== null) {
      const eve = WEEKDAYS[(favoriteWeekday + 6) % 7];
      action = `Enviar ingresso free na ${eve} e reservar ${usualTable ?? "o lugar de sempre"} para garantir a presença na ${WEEKDAYS[favoriteWeekday]}.`;
    } else if (segment === "em_risco") {
      action = "Cliente sumiu: enviar convite com drink de cortesia para trazê-lo de volta.";
    } else if (segment === "frequente") {
      action = "Oferecer upgrade para camarote com desconto.";
    }

    out.push({ customer, visits, visits90, avgSpendCents, totalSpendCents, favoriteWeekday, favoriteWeekdayShare, lastVisit: last, daysSinceLast, topProducts, usualTable, segment, score, action });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Quem deve receber convite hoje (véspera do dia favorito). */
export function invitesForToday(profiles: CustomerProfile[], now = Date.now()): CustomerProfile[] {
  const tomorrow = weekdayBR(new Date(now + DAY).toISOString());
  return profiles.filter((p) => (p.segment === "vip" || p.segment === "potencial") && p.favoriteWeekday === tomorrow && p.favoriteWeekdayShare >= 0.6);
}

// ------------------------------------------------------------------ produtos
export interface ProductStat {
  product: Product;
  units: number;
  revenueCents: number;
  marginCents: number;
  marginPct: number;
  status: "estrela" | "normal" | "parado";
  suggestion: { promoPriceCents: number; marginAfterCents: number; reason: string } | null;
}

export function productStats(ds: Dataset, now = Date.now(), days = 28): ProductStat[] {
  const since = now - days * DAY;
  const agg = new Map<string, { units: number; rev: number }>();
  for (const oi of ds.order_items) {
    if (oi.status === "cancelled" || new Date(oi.created_at).getTime() < since) continue;
    const a = agg.get(oi.product_id) ?? { units: 0, rev: 0 };
    a.units += oi.qty; a.rev += oi.qty * oi.unit_price_cents; agg.set(oi.product_id, a);
  }
  const active = ds.products.filter((p) => p.active);
  const unitsSorted = active.map((p) => agg.get(p.id)?.units ?? 0).sort((a, b) => a - b);
  const median = unitsSorted[Math.floor(unitsSorted.length / 2)] ?? 0;
  const topUnits = unitsSorted.at(-1) ?? 0;

  const stats = active.map((product): ProductStat => {
    const a = agg.get(product.id) ?? { units: 0, rev: 0 };
    const marginCents = a.rev - a.units * product.cost_cents;
    const marginPct = product.price_cents ? (product.price_cents - product.cost_cents) / product.price_cents : 0;
    const isBottle = product.category === "Garrafas";
    let status: ProductStat["status"] = "normal";
    if (a.units >= topUnits * 0.5 && a.units > 0) status = "estrela";
    else if (!isBottle && a.units <= Math.max(2, median * 0.15) && product.stock > 0) status = "parado";

    let suggestion: ProductStat["suggestion"] = null;
    if (status === "parado") {
      // preço promocional: ~35% off, mas nunca abaixo de 1,6× o custo; arredonda p/ real cheio
      const target = Math.max(product.cost_cents * 1.6, product.price_cents * 0.65);
      const promo = Math.min(product.price_cents - 100, Math.round(target / 100) * 100);
      suggestion = {
        promoPriceCents: promo,
        marginAfterCents: promo - product.cost_cents,
        reason: `Só ${a.units} vendidos em ${days} dias com ${product.stock} em estoque.`,
      };
    }
    return { product, units: a.units, revenueCents: a.rev, marginCents, marginPct, status, suggestion };
  });
  return stats.sort((x, y) => y.units - x.units);
}

// ------------------------------------------------------------------ demanda
export interface Forecast {
  expectedAttendance: number;
  history: { label: string; attendance: number }[];
  staff: { bartenders: number; security: number; door: number };
  stock: { name: string; units: number }[];
}

export function demandForecast(ds: Dataset, eventId: string): Forecast {
  const target = ds.events.find((e) => e.id === eventId);
  const wd = target ? weekdayBR(target.starts_at) : 5;
  const past = ds.events
    .filter((e) => e.id !== eventId && weekdayBR(e.starts_at) === wd && (!target || e.starts_at < target.starts_at))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const att = new Map<string, number>();
  for (const c of ds.checkins) att.set(c.event_id, (att.get(c.event_id) ?? 0) + 1);
  const history = past.slice(-6).map((e) => ({ label: new Date(e.starts_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), attendance: att.get(e.id) ?? 0 }));
  const last4 = history.slice(-4).map((h) => h.attendance);
  const w = [1, 2, 3, 4].slice(-last4.length);
  const wavg = last4.length ? last4.reduce((s, v, i) => s + v * w[i], 0) / w.reduce((s, v) => s + v, 0) : 0;
  const trend = last4.length >= 2 ? (last4.at(-1)! - last4[0]) / Math.max(1, last4.length - 1) : 0;
  const expectedAttendance = Math.max(0, Math.round(wavg + trend * 0.5));

  // consumo médio por pessoa nas últimas 4 edições
  const pastIds = new Set(past.slice(-4).map((e) => e.id));
  const units = new Map<string, number>();
  for (const oi of ds.order_items) if (pastIds.has(oi.event_id)) units.set(oi.product_id, (units.get(oi.product_id) ?? 0) + oi.qty);
  const people = past.slice(-4).reduce((s, e) => s + (att.get(e.id) ?? 0), 0) || 1;
  const stock = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, u]) => ({
    name: ds.products.find((p) => p.id === pid)?.name ?? pid,
    units: Math.ceil((u / people) * expectedAttendance * 1.15),
  }));

  return {
    expectedAttendance,
    history,
    staff: { bartenders: Math.max(2, Math.ceil(expectedAttendance / 80)), security: Math.max(2, Math.ceil(expectedAttendance / 100)), door: Math.max(1, Math.ceil(expectedAttendance / 300)) },
    stock,
  };
}
