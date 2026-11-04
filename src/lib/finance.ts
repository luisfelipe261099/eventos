import { db } from "./db";
import type { Checkin, Customer, EventItem, GuestListEntry, OrderItem, Product, Promoter, Tab, Ticket, TicketType } from "./types";

export async function financeReport() {
  const d = db();
  const [events, tickets, types, tabs, items, promoters, gl, checkins, customers, products] = await Promise.all([
    d.select<EventItem>("events"), d.select<Ticket>("tickets"), d.select<TicketType>("ticket_types"), d.select<Tab>("tabs"),
    d.select<OrderItem>("order_items"), d.select<Promoter>("promoters"), d.select<GuestListEntry>("guest_list"), d.select<Checkin>("checkins"),
    d.select<Customer>("customers"), d.select<Product>("products"),
  ]);
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
