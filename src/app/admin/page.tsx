import { currentEvent, liveStats } from "@/lib/repo";
import { customerProfiles, demandForecast, productStats } from "@/lib/insights";
import { isSupabaseConfigured } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { brl, WEEKDAYS } from "@/lib/format";
import { Avatar, DemoBanner, Page, Pill, Stat, TopBar } from "@/components/ui";
import OrdersBoard from "./OrdersBoard";
import PromoButton from "./PromoButton";
import CampaignBox from "./CampaignBox";
import InvitesButton from "./InvitesButton";

export const dynamic = "force-dynamic";

const SEG = { vip: ["★ VIP", "brand"], potencial: ["VIP em potencial", "brand"], frequente: ["Frequente", "ok"], em_risco: ["Em risco", "bad"], ocasional: ["Ocasional", "mut"] } as const;

function Section({ id, kick, title, children }: { id: string; kick: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="kick mt-10">{kick}</div>
      <h2 className="h-display mb-4 mt-1 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminPage() {
  const ev = await currentEvent();
  if (!ev) return <Page><TopBar title="Painel" /><p className="text-mut">Cadastre um evento para começar.</p></Page>;
  const s = await liveStats(ev.id);
  const profiles = customerProfiles(s.ds);
  const top = profiles.filter((p) => p.segment !== "ocasional").slice(0, 8);
  const products = productStats(s.ds);
  const stars = products.filter((p) => p.status !== "parado").slice(0, 5);
  const slow = products.filter((p) => p.status === "parado");
  const fc = demandForecast(s.ds, ev.id);
  const maxH = Math.max(1, ...s.hours.map((h) => h.n));
  const maxHist = Math.max(1, fc.expectedAttendance, ...fc.history.map((h) => h.attendance));
  const maxUnits = Math.max(1, ...products.map((p) => p.units));

  return (
    <Page wide>
      <TopBar title="Painel do dono" sub={`Hoje · ${ev.name}`} back="/" />
      <DemoBanner show={!isSupabaseConfigured()} />
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 text-sm">
        {[["geral", "Visão geral"], ["comandas", "Comandas"], ["clientes", "IA · Clientes"], ["bar", "IA · Bar"], ["previsao", "IA · Previsão"], ["marketing", "IA · Marketing"]].map(([id, t]) => (
          <a key={id} href={`#${id}`} className="pill bg-white/5 px-3 py-1.5 text-mut hover:text-white">{t}</a>
        ))}
      </nav>

      <Section id="geral" kick="Ao vivo" title="Visão geral">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Público na casa" value={`${s.inside} / ${s.sold}`} />
          <Stat label="Vendas de ingressos" value={brl(s.ticketRevenue)} />
          <Stat label="Bar + cardápio" value={brl(s.barRevenue)} tone="ok" />
          <Stat label="Comandas abertas" value={s.openTabs} />
        </div>
        <div className="card mt-3">
          <div className="text-xs uppercase tracking-widest text-mut">Entradas por hora</div>
          <div className="mt-3 flex h-28 items-end gap-2">
            {s.hours.map((h) => (
              <div key={h.h} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-md bg-gradient-to-t from-brand2/40 to-brand" style={{ height: `${(h.n / maxH) * 100}%`, minHeight: 2 }} />
                <span className="text-[10px] text-mut">{String(h.h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="comandas" kick="Bar & cozinha" title="Pedidos em andamento">
        <OrdersBoard />
      </Section>

      <Section id="clientes" kick="IA de clientes" title="Quem são seus melhores clientes">
        <p className="-mt-2 mb-4 text-sm text-mut">A IA cruza frequência, dia da semana, gasto e preferências. Na véspera do dia favorito de cada VIP, o sistema pode enviar um ingresso free com convite personalizado.</p>
        <InvitesButton />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {top.map((p) => (
            <div key={p.customer.id} className="card">
              <div className="flex items-center gap-3">
                <Avatar name={p.customer.name} size={44} />
                <div className="flex-1"><div className="font-semibold">{p.customer.name}</div><Pill tone={SEG[p.segment][1]}>{SEG[p.segment][0]}</Pill></div>
                <div className="text-right"><div className="text-xs text-mut">gasto médio</div><div className="font-bold text-ok">{brl(p.avgSpendCents)}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">Visitas 90d</div><b>{p.visits90}</b></div>
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">Dia favorito</div><b className="capitalize">{p.favoriteWeekday !== null ? WEEKDAYS[p.favoriteWeekday] : "-"}</b></div>
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">Prefere</div><b className="line-clamp-1">{p.topProducts[0]?.name ?? "-"}</b></div>
              </div>
              {p.action && <div className="mt-3 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm"><b className="text-brandl">✦ IA sugere:</b> {p.action}</div>}
            </div>
          ))}
        </div>
      </Section>

      <Section id="bar" kick="IA do bar" title="O que vende e o que está parado">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card">
            <div className="text-sm font-bold text-ok">🔥 Mais vendidos (28 dias)</div>
            {stars.map((p) => (
              <div key={p.product.id} className="mt-3">
                <div className="flex justify-between text-sm"><span>{p.product.name}</span><b>{p.units} un · {brl(p.revenueCents)}</b></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-ok" style={{ width: `${(p.units / maxUnits) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="text-sm font-bold text-bad">🧊 Parados</div>
            {slow.length === 0 && <p className="mt-3 text-sm text-mut">Nada parado. 👏</p>}
            {slow.map((p) => (
              <div key={p.product.id} className="mt-3 rounded-xl bg-white/5 p-3">
                <div className="flex justify-between text-sm"><span className="font-semibold">{p.product.name}</span><b className="text-bad">{p.units} un</b></div>
                <div className="mt-1 text-xs text-mut">{p.suggestion?.reason}</div>
                {p.suggestion && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-sm"><s className="text-mut">{brl(p.product.price_cents)}</s> → <b className="text-ok">{brl(p.suggestion.promoPriceCents)}</b> <span className="text-xs text-mut">margem {brl(p.suggestion.marginAfterCents)}</span></div>
                    <PromoButton productId={p.product.id} productName={p.product.name} promoCents={p.suggestion.promoPriceCents} active={!!p.product.promo_price_cents} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="previsao" kick="IA de previsão" title="Público, equipe e estoque">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card">
            <div className="text-xs uppercase tracking-widest text-mut">Histórico × previsão</div>
            <div className="mt-3 flex h-36 items-end gap-2">
              {fc.history.map((h) => (
                <div key={h.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t-md bg-[#3a4d7c]" style={{ height: `${(h.attendance / maxHist) * 100}%` }} /><span className="text-[10px] text-mut">{h.label}</span></div>
              ))}
              <div className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t-md border border-dashed border-white/40 bg-gradient-to-t from-brand2/40 to-brand" style={{ height: `${(fc.expectedAttendance / maxHist) * 100}%` }} /><span className="text-[10px] text-brandl">Próximo</span></div>
            </div>
            <div className="mt-3 text-sm">Público previsto: <b className="text-brandl">{fc.expectedAttendance} pessoas</b></div>
          </div>
          <div className="card space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Bartenders" value={fc.staff.bartenders} /><Stat label="Seguranças" value={fc.staff.security} /><Stat label="Portaria" value={fc.staff.door} />
            </div>
            <div className="text-xs uppercase tracking-widest text-mut">Estoque sugerido</div>
            {fc.stock.map((x) => <div key={x.name} className="flex justify-between text-sm"><span>{x.name}</span><b>{x.units} un</b></div>)}
          </div>
        </div>
      </Section>

      <Section id="marketing" kick="IA de marketing" title="Campanha com um clique">
        <CampaignBox suggestions={[...slow.filter((p) => p.suggestion).map((p) => `${p.product.name} por ${brl(p.suggestion!.promoPriceCents)} até 0h`), `Lista VIP aberta para a ${ev.name}`, "Últimos ingressos do lote"]} ai={aiEnabled()} />
      </Section>
    </Page>
  );
}
