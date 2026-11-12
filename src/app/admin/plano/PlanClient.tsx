"use client";
import { useState } from "react";
import type { FeeMode, Plan, PlanId } from "@/lib/plans";
import { brl } from "@/lib/format";

type Totals = { feeCents: number; buyerCents: number; venueCents: number };

export default function PlanClient({ plans, current, feeMode, hasSubscription, manual, doc, email, sample }: {
  plans: Plan[]; current: PlanId; feeMode: FeeMode; hasSubscription: boolean; manual: boolean; doc: string; email: string;
  sample: { buyer: Totals; venue: Totals; now: Totals };
}) {
  const [mode, setMode] = useState(feeMode);
  const [plan, setPlan] = useState(current);
  const [d, setD] = useState(doc);
  const [e, setE] = useState(email);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const post = async (body: unknown) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(j.error ?? "Não foi possível salvar."); return null; }
    return j;
  };
  async function saveMode(m: FeeMode) { const j = await post({ action: "fee_mode", fee_mode: m }); if (j) { setMode(m); setMsg("Salvo. Vale para as próximas vendas."); } }
  async function subscribe() {
    const j = await post({ action: "subscribe", plan, doc: d, email: e });
    if (!j) return;
    if (j.manual) { setMsg("Plano salvo. A Casa Cheia envia a cobrança da mensalidade no fim do período grátis."); setTimeout(() => location.reload(), 1200); }
    else if (j.open?.invoiceUrl) location.href = j.open.invoiceUrl;
    else location.reload();
  }
  const opt = (m: FeeMode, title: string, t: Totals) => (
    <button role="radio" aria-checked={mode === m} disabled={busy} onClick={() => saveMode(m)} className={`card text-left ring-2 ${mode === m ? "ring-brand" : "ring-transparent"}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-mut">Ingresso de {brl(5000)}: o cliente paga <b className="text-white">{brl(t.buyerCents)}</b> e a casa fica com <b className="text-white">{brl(t.venueCents)}</b>.</div>
    </button>
  );
  return (
    <>
      <h2 className="h-display mt-8 text-xl">Quem paga a taxa do ingresso</h2>
      <div role="radiogroup" className="mt-3 grid gap-3 md:grid-cols-2">
        {opt("buyer", "O cliente (taxa de serviço no checkout)", sample.buyer)}
        {opt("venue", "A casa (preço cheio para o cliente)", sample.venue)}
      </div>

      <h2 className="h-display mt-8 text-xl">{hasSubscription ? "Trocar de plano" : "Escolher o plano"}</h2>
      <div role="radiogroup" className="mt-3 grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <button key={p.id} role="radio" aria-checked={plan === p.id} onClick={() => setPlan(p.id)} className={`card text-left ring-2 ${plan === p.id ? "ring-brand" : "ring-transparent"}`}>
            <div className="font-semibold">{p.name}{p.id === current && <span className="ml-2 text-xs text-mut">atual</span>}</div>
            <div className="mt-1 text-2xl font-bold">{brl(p.monthlyCents)}<span className="text-sm font-normal text-mut"> /mês</span></div>
            <div className="text-sm text-mut">+ {String(p.feePercent).replace(".", ",")}% por ingresso (mín. {brl(p.feeMinCents)})</div>
            <div className="mt-2 text-xs text-mut">{p.pitch}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input className="input" inputMode="numeric" placeholder="CPF ou CNPJ de quem paga" value={d} onChange={(x) => setD(x.target.value)} />
        <input className="input" type="email" placeholder="E-mail para a cobrança" value={e} onChange={(x) => setE(x.target.value)} />
        <button className="btn" disabled={busy || d.replace(/\D/g, "").length < 11} onClick={subscribe}>{busy ? "Salvando…" : hasSubscription ? "Trocar plano" : manual ? "Confirmar plano" : "Assinar"}</button>
      </div>
      {msg && <p role="status" className="mt-3 rounded-xl bg-white/5 p-3 text-sm">{msg}</p>}
    </>
  );
}
