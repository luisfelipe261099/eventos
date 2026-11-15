import { platformData } from "@/lib/platform-data";
import { brl } from "@/lib/format";
import { Pill } from "@/components/ui";
import VenueActions from "../VenueActions";
import NewVenueForm from "./NewVenueForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Casas" };

const STATUS = { trial: ["Grátis", "brand"], active: ["Em dia", "ok"], past_due: ["Atrasada", "warn"], blocked: ["Pausada", "bad"] } as const;

export default async function Casas() {
  const d = await platformData();
  return (
    <>
      <h1 className="h-display text-2xl">Casas <span className="text-base font-normal text-mut">· {d.counts.total}</span></h1>
      <div className="mt-4 space-y-3">
        {d.rows.length === 0 && <p className="text-sm text-mut">Nenhuma casa cadastrada ainda.</p>}
        {d.rows.map((r) => {
          const [label, tone] = STATUS[(r.venue.plan_status ?? "trial") as keyof typeof STATUS] ?? STATUS.trial;
          const bal = d.balances.get(r.venue.id);
          return (
            <div key={r.venue.id} className="card">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold">{r.venue.name}</span><Pill tone={tone}>{label}</Pill>{r.venue.plan_status === "trial" && <span className="text-xs text-mut">{r.trialLeft} dia(s) grátis</span>}</div>
                  <div className="mt-0.5 text-sm text-mut">{[r.venue.owner_name, r.venue.owner_email, r.venue.owner_phone, r.venue.city].filter(Boolean).join(" · ")}</div>
                  <div className="mt-0.5 text-xs text-mut">Plano {r.plan.name} ({brl(r.plan.monthlyCents)} + {String(r.plan.feePercent).replace(".", ",")}%) · {r.venue.has_asaas ? "recebe na conta Asaas própria" : r.venue.pix_key ? `repasse para Pix ${r.venue.pix_key_type}` : "ainda sem chave Pix para o repasse"}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-sm">
                  <div><div className="text-xs text-mut">Ingressos no mês</div><div className="font-semibold">{r.fees.tickets}</div></div>
                  <div><div className="text-xs text-mut">Vendido</div><div className="font-semibold">{brl(r.fees.grossCents)}</div></div>
                  <div><div className="text-xs text-mut">A repassar</div><div className={`font-semibold ${bal && bal < 0 ? "text-bad" : "text-warn"}`}>{bal != null ? brl(bal) : "—"}</div></div>
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-3"><VenueActions venueId={r.venue.id} plan={r.plan.id} status={r.venue.plan_status ?? "trial"} plans={d.plans.map((p) => ({ id: p.id, name: p.name }))} /></div>
            </div>
          );
        })}
      </div>
      <h2 id="nova" className="h-display mt-10 scroll-mt-28 text-xl">Cadastrar casa</h2>
      <p className="mt-1 text-sm text-mut">A casa começa no período grátis e já pode vender. Mande para o dono o e-mail e a senha de acesso.</p>
      <NewVenueForm plans={d.plans.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
