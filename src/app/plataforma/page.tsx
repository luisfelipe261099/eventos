import { isRoot } from "@/lib/admin-auth";
import { db, isSupabaseConfigured } from "@/lib/db";
import { platformCfg, platformOverview } from "@/lib/billing";
import { platformWallet } from "@/lib/payments";
import { brl } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { DemoBanner, Page, Pill, Stat, TopBar } from "@/components/ui";
import Login from "../admin/Login";
import VenueActions from "./VenueActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plataforma", robots: { index: false } };

const STATUS = { trial: ["Grátis", "brand"], active: ["Em dia", "ok"], past_due: ["Atrasada", "warn"], blocked: ["Pausada", "bad"] } as const;

/** Visão da Casa Cheia: casas, planos, mensalidades e taxas do mês. */
export default async function Plataforma() {
  if (!(await isRoot())) return <Login />;
  const [o, leads] = await Promise.all([platformOverview(), db().select<Lead>("leads").catch(() => [] as Lead[])]);
  const month = new Date(`${o.month}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <Page wide>
      <TopBar title="Plataforma Casa Cheia" sub={`Casas e receita · ${month}`} back="/" />
      <DemoBanner show={!isSupabaseConfigured()} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Casas" value={o.rows.length} />
        <Stat label="Mensalidades (casas pagantes)" value={brl(o.mrrCents)} tone="ok" />
        <Stat label="Taxas de ingresso no mês" value={brl(o.feeCents)} tone="brand" />
        <Stat label="Taxas a faturar" value={brl(o.dueCents)} />
      </div>
      <p className="mt-2 text-xs text-mut">
        Taxa por ingresso: {platformWallet() ? "descontada de cada Pix pelo split do Asaas." : "sem ASAAS_SPLIT_WALLET_ID, fica como \"a faturar\"."}{" "}
        Mensalidade: {platformCfg() ? "cobrada pela conta Asaas da Casa Cheia." : "sem VIPFLOW_ASAAS_API_KEY, a cobrança é manual."}
      </p>

      <h2 className="h-display mt-8 text-xl">Casas</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-white/5 text-left text-xs text-mut"><tr><th className="p-3">Casa</th><th className="p-3">Plano</th><th className="p-3">Situação</th><th className="p-3">Ingressos pagos</th><th className="p-3">Vendido</th><th className="p-3">Taxa</th><th className="p-3">A faturar</th><th className="p-3">Ações</th></tr></thead>
          <tbody>
            {o.rows.map((r) => {
              const [label, tone] = STATUS[(r.venue.plan_status ?? "trial") as keyof typeof STATUS] ?? STATUS.trial;
              return (
                <tr key={r.venue.id} className="border-t border-line align-top">
                  <td className="p-3"><div className="font-medium">{r.venue.name}</div><div className="text-xs text-mut">{r.venue.owner_email ?? "sem conta própria"}{r.venue.owner_phone ? ` · ${r.venue.owner_phone}` : ""}</div><div className="text-xs text-mut">{r.venue.has_asaas ? "Pix ligado" : "Pix desligado"}</div></td>
                  <td className="p-3">{r.plan.name}<div className="text-xs text-mut">{brl(r.plan.monthlyCents)} + {String(r.plan.feePercent).replace(".", ",")}%</div></td>
                  <td className="p-3"><Pill tone={tone}>{label}</Pill>{r.venue.plan_status === "trial" && <div className="mt-1 text-xs text-mut">{r.trialLeft} dia(s)</div>}</td>
                  <td className="p-3">{r.fees.tickets}</td><td className="p-3">{brl(r.fees.grossCents)}</td><td className="p-3">{brl(r.fees.feeCents)}</td><td className="p-3 text-warn">{r.fees.dueCents ? brl(r.fees.dueCents) : "—"}</td>
                  <td className="p-3"><VenueActions venueId={r.venue.id} plan={r.plan.id} status={r.venue.plan_status ?? "trial"} plans={o.plans.map((p) => ({ id: p.id, name: p.name }))} /></td>
                </tr>
              );
            })}
            {o.rows.length === 0 && <tr><td className="p-4 text-mut" colSpan={8}>Nenhuma casa cadastrada ainda. Divulgue o link /cadastro.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="h-display mt-8 text-xl">Pedidos de contato</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {leads.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60).map((l) => (
          <li key={l.id} className="card"><div className="font-semibold">{l.name}</div><div className="text-sm text-mut">{[l.venue_name, l.city, l.plan].filter(Boolean).join(" · ")}</div>
            <a className="mt-2 inline-block text-brandl underline" href={`https://wa.me/55${l.phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">{l.phone}</a>
            <div className="text-xs text-mut">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div></li>
        ))}
        {leads.length === 0 && <li className="text-mut">Nenhum pedido ainda.</li>}
      </ul>
    </Page>
  );
}
