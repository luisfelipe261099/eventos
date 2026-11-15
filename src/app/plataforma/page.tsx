import { requireRoot } from "@/lib/admin-auth";
import Link from "next/link";
import { platformData } from "@/lib/platform-data";
import { ensurePlatformReady } from "@/lib/platform";
import { brl } from "@/lib/format";
import { Stat } from "@/components/ui";
import CopyField from "./CopyField";

export const dynamic = "force-dynamic";

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const KIND: Record<string, string> = { sale_ticket: "Ingresso", sale_tab: "Comanda", refund: "Estorno", adjust: "Ajuste" };

/** Visão geral da plataforma: o que entrou, o que é seu, o que falta repassar e o que pede atenção. */
export default async function Overview() {
  await requireRoot();
  const [d, health] = await Promise.all([platformData(), ensurePlatformReady()]);
  const month = new Date(`${d.month}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const alerts: { tone: "bad" | "warn"; text: React.ReactNode; href?: string }[] = [];
  if (health.error) alerts.push({ tone: "bad", text: <>Não consegui falar com a conta Asaas da plataforma: {health.error}</>, href: "/plataforma/sistema" });
  if (health.account && health.account.bankAccount !== "APPROVED") alerts.push({ tone: "warn", text: "Sua conta bancária ainda não foi aprovada no Asaas: você recebe, mas não consegue sacar o que é seu.", href: "/plataforma/sistema" });
  if (d.awaiting.length) alerts.push({ tone: "warn", text: <>{d.awaiting.length} repasse(s) esperando sua aprovação no app do Asaas.</>, href: "/plataforma/repasses" });
  if (d.counts.late) alerts.push({ tone: "warn", text: <>{d.counts.late} casa(s) com mensalidade atrasada.</>, href: "/plataforma/casas" });

  return (
    <>
      <h1 className="h-display text-2xl">Visão geral <span className="text-base font-normal text-mut">· {month}</span></h1>
      {alerts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {alerts.map((a, i) => (
            <li key={i}><Link href={a.href ?? "#"} className={`block rounded-xl border px-4 py-3 text-sm ${a.tone === "bad" ? "border-bad/40 bg-bad/10 text-bad" : "border-warn/40 bg-warn/10 text-warn"}`}>{a.text}</Link></li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Vendido nas casas no mês" value={brl(d.monthGrossCents)} />
        <Stat label="Sua taxa sobre ingressos no mês" value={brl(d.monthFeeCents)} tone="brand" />
        <Stat label="Mensalidades (casas em dia)" value={brl(d.mrrCents)} tone="ok" />
        <Stat label="A repassar às casas" value={brl(d.toRepassCents)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Casas" value={d.counts.total} />
        <Stat label="Em período grátis" value={d.counts.trial} />
        <Stat label="Pagando" value={d.counts.active} tone="ok" />
        <Stat label="Com atraso" value={d.counts.late} />
      </div>

      {d.counts.total === 0 ? (
        <div className="card mt-6">
          <div className="text-lg font-semibold">Nenhuma casa ainda</div>
          <p className="mt-1 text-sm text-mut">Cadastre a primeira casa você mesmo, ou mande o link de cadastro para o dono. Ela já começa vendendo: o Pix cai na conta da plataforma e a parte da casa vai para a chave Pix dela.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/plataforma/casas#nova" className="btn">Cadastrar casa</Link>
            <CopyField value={`${appUrl}/cadastro`} label="Copiar link de cadastro" />
          </div>
        </div>
      ) : (
        <>
          <h2 className="h-display mt-8 text-xl">Últimas vendas</h2>
          {d.recentSales.length === 0 ? <p className="mt-2 text-sm text-mut">Nenhuma venda pela plataforma ainda.</p> : (
            <ul className="card mt-3 divide-y divide-line p-0 text-sm">
              {d.recentSales.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-24 shrink-0 text-mut">{dt(e.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate">{d.names.get(e.venue_id) ?? "Casa"} · {KIND[e.kind]}{e.note ? ` · ${e.note}` : ""}</span>
                  <span className={e.gross_cents < 0 ? "text-bad" : ""}>{brl(e.gross_cents)}</span>
                  <span className="w-20 text-right text-brandl">{e.platform_fee_cents ? brl(e.platform_fee_cents) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-mut">À direita, a sua taxa em cada venda.</p>
        </>
      )}
    </>
  );
}
