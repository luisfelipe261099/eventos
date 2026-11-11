import Link from "next/link";
import { getVenueOrNull, venueFeeMode, venuePlan } from "@/lib/repo";
import { currentMonth, monthFees, platformCfg, syncBilling, trialDaysLeft } from "@/lib/billing";
import { PLANS, ticketTotals } from "@/lib/plans";
import { platformWallet } from "@/lib/payments";
import { brl } from "@/lib/format";
import { Page, Pill, Stat, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import PlanClient from "./PlanClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plano" };

const STATUS = { trial: ["Período grátis", "brand"], active: ["Em dia", "ok"], past_due: ["Mensalidade em atraso", "warn"], blocked: ["Vendas pausadas", "bad"] } as const;

export default async function PlanoPage() {
  const venue = await getVenueOrNull();
  if (!venue) return (
    <Page wide><TopBar title="Plano" back="/" /><AdminNav active="/admin/plano" />
      <p className="text-mut">Cadastre a casa em <Link className="text-brandl underline" href="/admin/setup">Configuração</Link> para escolher o plano.</p></Page>
  );
  const bill = await syncBilling(venue.id).catch(() => ({ status: venue.plan_status ?? "trial", open: null, manual: !platformCfg() }));
  const [fees, plan, mode] = [await monthFees(venue.id), venuePlan(venue), venueFeeMode(venue)];
  const [label, tone] = STATUS[(bill.status ?? "trial") as keyof typeof STATUS] ?? STATUS.trial;
  const left = trialDaysLeft(venue);
  const sample = ticketTotals(5000, plan, mode);
  const month = new Date(`${currentMonth()}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <Page wide>
      <TopBar title="Plano" sub="Mensalidade e taxa por ingresso" back="/" />
      <AdminNav active="/admin/plano" />
      <div className="card flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-mut">Plano atual</div>
          <div className="h-display text-2xl">{plan.name}</div>
          <div className="text-sm text-mut">{brl(plan.monthlyCents)} por mês + {String(plan.feePercent).replace(".", ",")}% por ingresso pago (mínimo {brl(plan.feeMinCents)}). Ingresso grátis não paga taxa.</div>
        </div>
        <Pill tone={tone}>{label}</Pill>
      </div>
      {bill.status === "trial" && <p className="mt-2 text-sm text-mut">{left > 0 ? `Faltam ${left} dia(s) do período grátis. Nesse tempo você não paga mensalidade.` : "Seu período grátis terminou."}</p>}
      {bill.status === "blocked" && <p className="mt-2 text-sm text-bad">As vendas online estão pausadas até a mensalidade ser regularizada.</p>}
      {bill.open && <a className="btn mt-3 inline-flex" href={bill.open.invoiceUrl} target="_blank" rel="noreferrer">Pagar mensalidade de {brl(Math.round(bill.open.value * 100))} (vence {bill.open.dueDate.split("-").reverse().join("/")})</a>}

      <h2 className="h-display mt-8 text-xl">Taxas de ingresso em {month}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Ingressos pagos" value={fees.tickets} />
        <Stat label="Vendido em ingressos" value={brl(fees.grossCents)} tone="ok" />
        <Stat label="Taxa VipFlow" value={brl(fees.feeCents)} />
        <Stat label={platformWallet() ? "Já descontada no Pix" : "A pagar com a mensalidade"} value={brl(platformWallet() ? fees.splitCents : fees.dueCents)} />
      </div>
      {fees.dueCents > 0 && platformWallet() && <p className="mt-2 text-xs text-mut">{brl(fees.dueCents)} em taxas de vendas anteriores ao desconto automático entram na próxima mensalidade.</p>}

      <PlanClient
        plans={PLANS} current={plan.id} feeMode={mode} hasSubscription={Boolean(venue.billing_subscription_id)} manual={bill.manual}
        doc={venue.doc ?? ""} email={venue.owner_email ?? ""}
        sample={{ buyer: ticketTotals(5000, plan, "buyer"), venue: ticketTotals(5000, plan, "venue"), now: sample }}
      />
      <p className="mt-6 text-xs text-mut">Sem fidelidade: você troca de plano ou cancela quando quiser. O Pix de cada venda cai direto na conta Asaas da casa. <Link className="underline" href="/planos">Comparar planos e simular o custo</Link>.</p>
    </Page>
  );
}
