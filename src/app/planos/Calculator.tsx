"use client";
import { useState } from "react";
import { PLANS, bestPlan, marketCostCents, monthlyCostCents } from "@/lib/plans";
import { brl } from "@/lib/format";

export default function Calculator() {
  const [tickets, setTickets] = useState(400);
  const [price, setPrice] = useState(40);
  const cents = price * 100;
  const best = bestPlan(tickets, cents);
  const market = marketCostCents(tickets, cents);
  const mine = monthlyCostCents(best, tickets, cents);
  const max = Math.max(market, ...PLANS.map((p) => monthlyCostCents(p, tickets, cents)));
  const bar = (label: string, value: number, strong: boolean, note?: string) => (
    <div>
      <div className="flex items-baseline justify-between text-sm"><span className={strong ? "font-semibold" : "text-nevoa"}>{label}{note && <span className="ml-2 rounded-full bg-violeta px-2 py-0.5 text-[11px] font-semibold text-white">{note}</span>}</span><span className={strong ? "font-semibold" : "text-nevoa"}>{brl(value)}</span></div>
      <div className="mt-1 h-3 rounded-full bg-linha"><div className={`h-3 rounded-full ${strong ? "bg-violeta" : "bg-nevoa/50"}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
    </div>
  );
  return (
    <div className="sheet mt-5 grid gap-8 p-6 md:grid-cols-2">
      <div className="space-y-6">
        <label className="block"><span className="flex justify-between text-sm font-medium"><span>Ingressos pagos por mês</span><span className="poster text-[22px]">{tickets.toLocaleString("pt-BR")}</span></span>
          <input type="range" min={0} max={5000} step={50} value={tickets} onChange={(e) => setTickets(Number(e.target.value))} className="mt-2 w-full accent-[#8b2cf5]" /></label>
        <label className="block"><span className="flex justify-between text-sm font-medium"><span>Preço médio do ingresso</span><span className="poster text-[22px]">{brl(cents)}</span></span>
          <input type="range" min={10} max={300} step={5} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-2 w-full accent-[#8b2cf5]" /></label>
        <div className="rounded-2xl bg-papel p-4">
          <div className="text-sm text-nevoa">Com o plano {best.name} você economiza</div>
          <div className="poster text-[44px] text-violeta">{brl(Math.max(0, market - mine))}<span className="text-base font-medium text-nevoa"> por mês</span></div>
          <div className="text-sm text-nevoa">{brl(Math.max(0, market - mine) * 12)} em um ano.</div>
        </div>
      </div>
      <div className="space-y-4" aria-live="polite">
        {PLANS.map((p) => <div key={p.id}>{bar(`Casa Cheia ${p.name}`, monthlyCostCents(p, tickets, cents), true, p.id === best.id ? "melhor para você" : undefined)}</div>)}
        {bar("Ticketeira + sistema de bar", market, false)}
      </div>
    </div>
  );
}
