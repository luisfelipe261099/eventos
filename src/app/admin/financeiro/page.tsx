import { financeReport } from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { Page, Stat, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import PayoutBox from "./PayoutBox";
import { getVenueOrNull, payMode } from "@/lib/repo";
import { balance, MIN_PAYOUT_CENTS } from "@/lib/payouts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financeiro" };

export default async function Financeiro() {
  const { rows, byPromoter } = await financeReport();
  const venue = await getVenueOrNull();
  const mode = venue ? await payMode(venue.id) : null;
  const custody = mode?.kind === "asaas" && mode.custody;
  const bal = custody && venue ? await balance(venue.id) : null;
  const sum = (k: "ticketRevenue" | "barPaid" | "commission" | "refunded" | "fees") => rows.reduce((s, r) => s + r[k], 0);
  const exp = [["resumo", "Resumo por evento"], ["ingressos", "Ingressos"], ["consumo", "Consumo do bar"], ["comissoes", "Comissões"], ["backup", "Backup completo (JSON)"]];
  return (
    <Page wide>
      <TopBar title="Financeiro" sub="Vendas, bar, comissões e exportação" back="/" />
      <AdminNav active="/admin/financeiro" />
      {bal && venue && <PayoutBox availableCents={bal.availableCents} minCents={MIN_PAYOUT_CENTS} pixKey={venue.pix_key ?? ""} auto={venue.payout_auto !== false}
        payouts={bal.payouts.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => ({ id: p.id, value_cents: p.value_cents, fee_cents: p.fee_cents, status: p.status, created_at: p.created_at, auto: p.auto, fail_reason: p.fail_reason }))} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Ingressos (total)" value={brl(sum("ticketRevenue"))} />
        <Stat label="Bar pago (total)" value={brl(sum("barPaid"))} tone="ok" />
        <Stat label="Comissões de promoters" value={brl(sum("commission"))} />
        <Stat label="Estornos" value={brl(sum("refunded"))} />
        <Stat label="Taxa Casa Cheia (ingressos)" value={brl(sum("fees"))} />
      </div>
      <div className="card mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm text-mut">Baixar planilha:</span>
        {exp.map(([k, l]) => <a key={k} className="btn-ghost py-2 text-xs" href={`/api/admin/export?tipo=${k}`}>{l}</a>)}
      </div>
      <p className="mt-2 text-xs text-mut">As planilhas abrem direto no Excel ou no Google Planilhas. O backup completo é útil porque o plano grátis do Supabase não faz cópias automáticas: baixe toda semana.</p>

      <h2 className="h-display mt-8 text-xl">Por evento</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/5 text-left text-xs text-mut"><tr><th className="p-3">Evento</th><th className="p-3">Vendidos</th><th className="p-3">Ingressos</th><th className="p-3">Entraram</th><th className="p-3">Bar pago</th><th className="p-3">Bar em aberto</th><th className="p-3">Comissões</th></tr></thead>
          <tbody>
            {rows.slice(0, 40).map((r) => (
              <tr key={r.event.id} className="border-t border-line">
                <td className="p-3"><div className="font-medium">{r.event.name}</div><div className="text-xs text-mut">{fmtDate(r.event.starts_at)}{r.pending ? ` · ${r.pending} aguardando Pix` : ""}</div></td>
                <td className="p-3">{r.ticketsSold}</td><td className="p-3">{brl(r.ticketRevenue)}</td><td className="p-3">{r.inside}</td>
                <td className="p-3 text-ok">{brl(r.barPaid)}</td><td className="p-3 text-warn">{r.barOpen ? brl(r.barOpen) : "—"}</td><td className="p-3">{brl(r.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="h-display mt-8 text-xl">Comissões a pagar</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {byPromoter.map((p) => (
          <li key={p.promoter.id} className="card"><div className="font-semibold">{p.promoter.name}</div><div className="text-sm text-mut">{p.inside} de {p.total} convidados entraram</div><div className="mt-2 text-xl font-bold text-ok">{brl(p.dueCents)}</div></li>
        ))}
        {byPromoter.length === 0 && <li className="text-mut">Nenhum promoter cadastrado.</li>}
      </ul>
    </Page>
  );
}
