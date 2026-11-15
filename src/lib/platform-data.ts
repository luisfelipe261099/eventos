/** Números da área de administração (todas as casas). */
import { db } from "./db";
import { platformOverview } from "./billing";
import { balance } from "./payouts";
import { platformCfg } from "./payments";
import type { LedgerEntry, Payout, Venue } from "./types";

export async function platformData() {
  const o = await platformOverview();
  const custody = Boolean(platformCfg());
  const balances = new Map<string, number>();
  if (custody) for (const r of o.rows) if (!r.venue.has_asaas) balances.set(r.venue.id, (await balance(r.venue.id)).availableCents);
  const [ledger, payouts] = await Promise.all([db().select<LedgerEntry>("ledger").catch(() => []), db().select<Payout>("payouts").catch(() => [])]);
  const monthEntries = ledger.filter((e) => e.created_at.slice(0, 7) === o.month);
  const sales = monthEntries.filter((e) => e.kind === "sale_ticket" || e.kind === "sale_tab");
  const names = new Map(o.rows.map((r) => [r.venue.id, r.venue.name]));
  return {
    ...o, custody, balances, names,
    toRepassCents: [...balances.values()].reduce((s, v) => s + Math.max(0, v), 0),
    // quanto passou pela plataforma no mês (ingressos e comandas) e quanto ficou de taxa
    monthGrossCents: sales.reduce((s, e) => s + e.gross_cents, 0) + o.rows.filter((r) => r.venue.has_asaas).reduce((s, r) => s + r.fees.grossCents, 0),
    monthFeeCents: monthEntries.reduce((s, e) => s + e.platform_fee_cents, 0) + o.rows.filter((r) => r.venue.has_asaas).reduce((s, r) => s + r.fees.splitCents, 0),
    recentSales: [...ledger].filter((e) => e.kind !== "adjust").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    payouts: [...payouts].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    awaiting: payouts.filter((p) => p.status === "awaiting_authorization"),
    counts: {
      total: o.rows.length,
      trial: o.rows.filter((r) => (r.venue.plan_status ?? "trial") === "trial").length,
      active: o.rows.filter((r) => r.venue.plan_status === "active").length,
      late: o.rows.filter((r) => r.venue.plan_status === "past_due" || r.venue.plan_status === "blocked").length,
    },
  };
}
export type PlatformData = Awaited<ReturnType<typeof platformData>>;
export type { Venue };
