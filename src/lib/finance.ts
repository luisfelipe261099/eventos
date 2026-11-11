import { db } from "./db";
import { getVenueOrNull } from "./repo";
import type { Checkin, Customer, EventItem, GuestListEntry, OrderItem, Product, Promoter, Tab, Ticket, TicketType } from "./types";

export async function financeReport() {
  const d = db();
  const venue = await getVenueOrNull();
  const vid = venue?.id ?? "-";
  const all = await Promise.all([
    d.select<EventItem>("events", { venue_id: vid }), d.select<Ticket>("tickets"), d.select<TicketType>("ticket_types"), d.select<Tab>("tabs"),
    d.select<OrderItem>("order_items"), d.select<Promoter>("promoters", { venue_id: vid }), d.select<GuestListEntry>("guest_list"), d.select<Checkin>("checkins"),
    d.select<Customer>("customers"), d.select<Product>("products", { venue_id: vid }),
  ]);
  // só o que é da casa da sessão
  const events = all[0], promoters = all[5], products = all[9];
  const evIds = new Set(events.map((e) => e.id));
  const mine = <T extends { event_id: string }>(rows: T[]) => rows.filter((r) => evIds.has(r.event_id));
  const tickets = mine(all[1]), types = mine(all[2]), tabs = mine(all[3]), items = mine(all[4]), gl = mine(all[6]), checkins = mine(all[7]);
  const seen = new Set([...tickets.map((t) => t.customer_id), ...tabs.map((t) => t.customer_id), ...gl.map((g) => g.customer_id)]);
  const customers = all[8].filter((c) => seen.has(c.id));
  const sold = (t: Ticket) => t.status === "paid" || t.status === "used";
  const tabTotal = (tabId: string) => { const s = items.filter((i) => i.tab_id === tabId && i.status !== "cancelled").reduce((a, i) => a + i.qty * i.unit_price_cents, 0); return s + Math.round(s * 0.1); };
  const rows = events.sort((a, b) => b.starts_at.localeCompare(a.starts_at)).map((e) => {
    const tk = tickets.filter((t) => t.event_id === e.id);
    const tb = tabs.filter((t) => t.event_id === e.id);
    const paidTabs = tb.filter((t) => t.status === "paid");
    const commission = promoters.reduce((s, p) => s + gl.filter((g) => g.event_id === e.id && g.promoter_id === p.id && g.status === "inside").length * p.commission_cents, 0);
    return {
      event: e,
      ticketsSold: tk.filter(sold).length,
      ticketRevenue: tk.filter(sold).reduce((s, t) => s + t.price_cents, 0),
      refunded: tk.filter((t) => t.status === "refunded").reduce((s, t) => s + t.price_cents, 0),
      fees: tk.filter(sold).reduce((s, t) => s + (t.fee_cents ?? 0), 0),
      pending: tk.filter((t) => t.status === "pending").length,
      inside: checkins.filter((c) => c.event_id === e.id).length,
      barPaid: paidTabs.reduce((s, t) => s + tabTotal(t.id), 0),
      barOpen: tb.filter((t) => t.status === "open").reduce((s, t) => s + tabTotal(t.id), 0),
      commission,
    };
  });
  const byPromoter = promoters.map((p) => {
    const inside = gl.filter((g) => g.promoter_id === p.id && g.status === "inside").length;
    return { promoter: p, inside, total: gl.filter((g) => g.promoter_id === p.id).length, dueCents: inside * p.commission_cents };
  });
  return { rows, byPromoter, raw: { events, tickets, types, tabs, items, promoters, gl, checkins, customers, products } };
}

export function toCsv(header: string[], lines: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "\ufeff" + [header, ...lines].map((l) => l.map(esc).join(";")).join("\n"); // ; e BOM: abre certo no Excel brasileiro
}
