/**
 * Planos da VipFlow: mensalidade + taxa por ingresso vendido.
 *
 * Referência de mercado (pesquisa de 11/2026): ticketeiras cobram ~10% por
 * ingresso com mínimo de R$ 2,00 a R$ 3,99 e seguram o dinheiro até depois do
 * evento; sistemas de comanda/cardápio custam R$ 100 a R$ 300 por mês.
 * Aqui a taxa é a metade ou menos, o mínimo é baixo e o Pix cai direto na
 * conta da casa. Todos os planos têm todos os recursos: a escolha é por volume.
 */
export type PlanId = "essencial" | "pro" | "ilimitado";
export type FeeMode = "buyer" | "venue";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyCents: number;
  /** % sobre o valor de face de cada ingresso pago */
  feePercent: number;
  /** piso da taxa por ingresso pago, em centavos */
  feeMinCents: number;
  pitch: string;
}

export const PLANS: Plan[] = [
  { id: "essencial", name: "Essencial", monthlyCents: 7900, feePercent: 5, feeMinCents: 100, pitch: "Para quem está começando ou faz poucos eventos por mês." },
  { id: "pro", name: "Pro", monthlyCents: 14900, feePercent: 3.5, feeMinCents: 80, pitch: "Para casas com evento toda semana." },
  { id: "ilimitado", name: "Casa Cheia", monthlyCents: 29900, feePercent: 2, feeMinCents: 50, pitch: "Para quem vende muito ingresso: a menor taxa." },
];

export const TRIAL_DAYS = 30;
export const DEFAULT_PLAN: PlanId = "essencial";

export const getPlan = (id: string | null | undefined): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** Taxa da VipFlow em um ingresso. Ingresso grátis não paga nada. */
export function ticketFeeCents(priceCents: number, plan: Plan): number {
  if (priceCents <= 0) return 0;
  return Math.min(priceCents, Math.max(plan.feeMinCents, Math.round((priceCents * plan.feePercent) / 100)));
}

/** Quanto o comprador paga e quanto fica com a casa (antes da tarifa do Asaas). */
export function ticketTotals(priceCents: number, plan: Plan, mode: FeeMode) {
  const feeCents = ticketFeeCents(priceCents, plan);
  const buyerCents = mode === "buyer" ? priceCents + feeCents : priceCents;
  return { feeCents, buyerCents, venueCents: buyerCents - feeCents };
}

/** Custo mensal da casa em um plano, dado o volume de ingressos pagos. */
export function monthlyCostCents(plan: Plan, tickets: number, avgPriceCents: number): number {
  return plan.monthlyCents + tickets * ticketFeeCents(avgPriceCents, plan);
}

/** Plano mais barato para um volume. */
export function bestPlan(tickets: number, avgPriceCents: number): Plan {
  return [...PLANS].sort((a, b) => monthlyCostCents(a, tickets, avgPriceCents) - monthlyCostCents(b, tickets, avgPriceCents))[0];
}

/**
 * Comparação com o mercado: ticketeira a 10% com mínimo de R$ 2,50 por ingresso
 * mais um sistema de comanda/cardápio de R$ 185 por mês (meio da faixa publicada).
 */
export const MARKET = { feePercent: 10, feeMinCents: 250, barSystemCents: 18500 };
export function marketCostCents(tickets: number, avgPriceCents: number): number {
  const perTicket = avgPriceCents <= 0 ? 0 : Math.max(MARKET.feeMinCents, Math.round(avgPriceCents * MARKET.feePercent / 100));
  return MARKET.barSystemCents + tickets * perTicket;
}
