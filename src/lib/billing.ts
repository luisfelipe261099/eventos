/**
 * Cobrança da VipFlow sobre as casas: mensalidade do plano + taxa por ingresso.
 *
 * - Taxa por ingresso: sai de cada venda pelo split do Asaas (ASAAS_SPLIT_WALLET_ID).
 *   Sem carteira configurada, fica registrada no ingresso e aparece como "a faturar".
 * - Mensalidade: assinatura na conta Asaas DA VIPFLOW (VIPFLOW_ASAAS_API_KEY).
 *   A casa paga por Pix, boleto ou cartão. Sem a chave, a cobrança é manual
 *   e nada é bloqueado sozinho.
 */
import { db } from "./db";
import { asaas, ensureCustomer, todayBR, type AsaasCfg } from "./payments";
import { getPlan, type PlanId, PLANS } from "./plans";
import { listVenues, venueRaw } from "./repo";
import type { EventItem, Ticket, Venue } from "./types";

export const platformCfg = (): AsaasCfg | null => (process.env.VIPFLOW_ASAAS_API_KEY ? { apiKey: process.env.VIPFLOW_ASAAS_API_KEY } : null);
/** Dias de atraso da mensalidade até pausar as vendas da casa. */
export const GRACE_DAYS = 10;

const brMonth = (iso: string) => new Date(new Date(iso).getTime() - 3 * 36e5).toISOString().slice(0, 7);
export const currentMonth = () => brMonth(new Date().toISOString());

/** Taxas de ingresso da casa em um mês (AAAA-MM): quanto já foi repassado pelo split e quanto falta faturar. */
export async function monthFees(venueId: string, month = currentMonth()) {
  const events = await db().select<EventItem>("events", { venue_id: venueId });
  const ids = new Set(events.map((e) => e.id));
  const sold = (await db().select<Ticket>("tickets")).filter((t) => ids.has(t.event_id) && (t.status === "paid" || t.status === "used") && t.price_cents > 0 && brMonth(t.created_at) === month);
  const fee = (rows: Ticket[]) => rows.reduce((s, t) => s + (t.fee_cents ?? 0), 0);
  return {
    month, tickets: sold.length, grossCents: sold.reduce((s, t) => s + t.price_cents, 0),
    feeCents: fee(sold), splitCents: fee(sold.filter((t) => t.fee_split)), dueCents: fee(sold.filter((t) => !t.fee_split)),
  };
}

export function trialDaysLeft(v: Pick<Venue, "trial_ends_at">, now = Date.now()) {
  return v.trial_ends_at ? Math.max(0, Math.ceil((new Date(v.trial_ends_at).getTime() - now) / 864e5)) : 0;
}

interface SubPayment { id: string; status: string; dueDate: string; value: number; invoiceUrl: string }

/** Cria a assinatura da mensalidade. A primeira cobrança vence no fim do período grátis. */
export async function subscribe(venueId: string, input: { doc: string; email: string; plan: PlanId }) {
  const cfg = platformCfg();
  const v = await venueRaw(venueId);
  if (!v) throw new Error("Casa não encontrada.");
  const plan = getPlan(input.plan);
  const doc = input.doc.replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) throw new Error("Informe um CPF ou CNPJ válido.");
  await db().update<Venue>("venues", venueId, { doc, plan: plan.id });
  if (!cfg) return { manual: true as const };
  const customer = v.billing_customer_id && v.doc === doc ? v.billing_customer_id
    : await ensureCustomer(cfg, { name: v.name, cpf: doc, phone: v.owner_phone, email: input.email || v.owner_email });
  const trialEnd = v.trial_ends_at ? new Date(new Date(v.trial_ends_at).getTime() - 3 * 36e5).toISOString().slice(0, 10) : todayBR();
  const body = { value: plan.monthlyCents / 100, description: `VipFlow · plano ${plan.name}`, cycle: "MONTHLY" };
  if (v.billing_subscription_id) {
    await asaas(cfg, `/subscriptions/${v.billing_subscription_id}`, { method: "PUT", body: { ...body, updatePendingPayments: true } });
    await db().update<Venue>("venues", venueId, { billing_customer_id: customer });
    return { manual: false as const, subscriptionId: v.billing_subscription_id };
  }
  const sub = await asaas<{ id: string }>(cfg, "/subscriptions", {
    method: "POST",
    body: { ...body, customer, billingType: "UNDEFINED", nextDueDate: trialEnd > todayBR() ? trialEnd : todayBR(), externalReference: `venue:${venueId}` },
  });
  await db().update<Venue>("venues", venueId, { billing_customer_id: customer, billing_subscription_id: sub.id });
  return { manual: false as const, subscriptionId: sub.id };
}

/** Situação que decorre das cobranças da assinatura (função pura, testada). */
export function statusFromPayments(payments: Pick<SubPayment, "status" | "dueDate">[], today: string, trialActive: boolean): NonNullable<Venue["plan_status"]> {
  const overdue = payments.filter((p) => p.status === "OVERDUE").map((p) => p.dueDate).sort()[0];
  if (overdue) {
    const days = Math.floor((new Date(today).getTime() - new Date(overdue).getTime()) / 864e5);
    return days >= GRACE_DAYS ? "blocked" : "past_due";
  }
  const paid = payments.some((p) => ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status));
  return paid || !trialActive ? "active" : "trial";
}

/** Consulta o Asaas da VipFlow e atualiza a situação da casa. Devolve a fatura em aberto, se houver. */
export async function syncBilling(venueId: string) {
  const cfg = platformCfg();
  const v = await venueRaw(venueId);
  if (!cfg || !v) return { status: v?.plan_status ?? "trial", open: null as SubPayment | null, manual: !cfg };
  const trialActive = trialDaysLeft(v) > 0;
  let status: NonNullable<Venue["plan_status"]>;
  let open: SubPayment | null = null;
  if (v.billing_subscription_id) {
    const { data } = await asaas<{ data: SubPayment[] }>(cfg, `/subscriptions/${v.billing_subscription_id}/payments?limit=24`);
    status = statusFromPayments(data, todayBR(), trialActive);
    open = data.filter((p) => p.status === "OVERDUE" || p.status === "PENDING").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;
  } else {
    // sem assinatura: depois do período grátis avisa, e pausa as vendas passada a carência
    const lateDays = v.trial_ends_at ? Math.floor((Date.now() - new Date(v.trial_ends_at).getTime()) / 864e5) : 0;
    status = trialActive ? "trial" : lateDays >= GRACE_DAYS ? "blocked" : "past_due";
  }
  if (status !== v.plan_status) await db().update<Venue>("venues", venueId, { plan_status: status });
  return { status, open, manual: false };
}

export async function syncAllBilling() {
  if (!platformCfg()) return { synced: 0, manual: true };
  let synced = 0;
  for (const v of await listVenues()) { await syncBilling(v.id).catch((e) => console.error("[billing]", v.id, e)); synced++; }
  return { synced, manual: false };
}

/** Visão da VipFlow: cada casa com plano, situação e o que gerou no mês. */
export async function platformOverview(month = currentMonth()) {
  const venues = await listVenues();
  const rows = await Promise.all(venues.map(async (v) => ({ venue: v, plan: getPlan(v.plan), fees: await monthFees(v.id, month), trialLeft: trialDaysLeft(v) })));
  const paying = rows.filter((r) => r.venue.plan_status === "active" || r.venue.plan_status === "past_due");
  return {
    month, rows,
    mrrCents: paying.reduce((s, r) => s + r.plan.monthlyCents, 0),
    feeCents: rows.reduce((s, r) => s + r.fees.feeCents, 0),
    dueCents: rows.reduce((s, r) => s + r.fees.dueCents, 0),
    plans: PLANS,
  };
}
