import { platformData } from "@/lib/platform-data";
import { ensurePlatformReady } from "@/lib/platform";
import { brl } from "@/lib/format";
import { Pill } from "@/components/ui";
import PayoutNow from "./PayoutNow";
import CopyField from "../CopyField";

export const dynamic = "force-dynamic";
export const metadata = { title: "Repasses" };

const ST: Record<string, [string, "ok" | "warn" | "bad" | "mut"]> = {
  requested: ["Enviando", "warn"], pending: ["Enviando", "warn"], awaiting_authorization: ["Aprovar no app do Asaas", "warn"],
  done: ["Pago", "ok"], failed: ["Não enviado", "bad"], cancelled: ["Cancelado", "bad"],
};
const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Repasses às casas: saldo de cada uma, repasse na hora e histórico. */
export default async function Repasses() {
  const [d, health] = await Promise.all([platformData(), ensurePlatformReady()]);
  const withBalance = d.rows.filter((r) => d.balances.has(r.venue.id));
  return (
    <>
      <h1 className="h-display text-2xl">Repasses</h1>
      <p className="mt-1 text-sm text-mut">O Pix das vendas cai na conta da plataforma; a parte de cada casa vai para a chave Pix dela, sozinha todo dia ou quando ela (ou você) pedir.</p>
      {d.awaiting.length > 0 && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          <p className="font-semibold">{d.awaiting.length} repasse(s) esperando sua aprovação</p>
          <p className="mt-1">O Asaas pede aprovação (código por SMS ou pelo app) em toda transferência. Abra o app do Asaas e aprove. Para não precisar aprovar nunca mais, ligue uma vez em <b>Menu → Integrações → Mecanismos de segurança → Validação de saque via webhook</b>:</p>
          <div className="mt-2 flex flex-wrap gap-2"><CopyField value={health.saqueUrl} label="Copiar URL" /><CopyField value={health.saqueToken} label="Copiar token" /></div>
        </div>
      )}

      <h2 className="h-display mt-6 text-xl">Saldo das casas</h2>
      <div className="mt-3 space-y-2">
        {withBalance.length === 0 && <p className="text-sm text-mut">Nenhuma casa recebendo pela plataforma ainda.</p>}
        {withBalance.map((r) => {
          const bal = d.balances.get(r.venue.id)!;
          return (
            <div key={r.venue.id} className="card flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><div className="font-medium">{r.venue.name}</div><div className="text-xs text-mut">{r.venue.pix_key ? `Chave ${r.venue.pix_key_type}: ${r.venue.pix_key}` : "Sem chave Pix: o dinheiro fica guardado até a casa cadastrar"}{r.venue.payout_auto === false ? " · repasse automático desligado" : ""}</div></div>
              <div className={`text-lg font-semibold ${bal < 0 ? "text-bad" : ""}`}>{brl(bal)}</div>
              <PayoutNow venueId={r.venue.id} disabled={!r.venue.pix_key || bal < 500} />
            </div>
          );
        })}
      </div>

      <h2 className="h-display mt-8 text-xl">Histórico</h2>
      {d.payouts.length === 0 ? <p className="mt-2 text-sm text-mut">Nenhum repasse ainda.</p> : (
        <ul className="card mt-3 divide-y divide-line p-0 text-sm">
          {d.payouts.slice(0, 60).map((p) => {
            const [label, tone] = ST[p.status] ?? [p.status, "mut"];
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-24 text-mut">{dt(p.created_at)}</span>
                <span className="min-w-0 flex-1 truncate">{d.names.get(p.venue_id) ?? "Casa"}{p.auto ? " · automático" : ""}{p.fail_reason ? <span className="text-xs text-bad"> · {p.fail_reason}</span> : null}</span>
                <span>{brl(p.value_cents)}</span><Pill tone={tone}>{label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
