"use client";
import { useState } from "react";
import type { Promoter } from "@/lib/types";
import { brl } from "@/lib/format";

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const toCents = (v: string) => Math.round(parseFloat(v.replace(",", ".")) * 100) || 0;

export default function PromotersEditor({ initial, stats }: { initial: Promoter[]; stats: Record<string, { total: number; inside: number }> }) {
  const [list, setList] = useState(initial);
  const [f, setF] = useState({ name: "", phone: "", commission: "15,00" });
  const [msg, setMsg] = useState("");
  const link = (p: Promoter) => `${typeof window !== "undefined" ? location.origin : ""}/promoter?k=${p.access_code ?? p.id}`;

  async function add() {
    setMsg("");
    const r = await fetch("/api/admin/promoters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, phone: f.phone, commission_cents: toCents(f.commission) }) });
    const j = await r.json(); if (!r.ok) return setMsg(j.error);
    setList([{ ...j, access_code: j.access_code ?? j.id }, ...list]); setF({ name: "", phone: "", commission: f.commission });
    setMsg(`${j.name} cadastrado. Envie o link de acesso para ele pelo WhatsApp.`);
  }
  async function toggle(p: Promoter) {
    const r = await fetch("/api/admin/promoters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, active: !(p.active ?? true) }) });
    if (r.ok) setList(list.map((x) => (x.id === p.id ? { ...x, active: !(p.active ?? true) } : x)));
  }
  const wa = (p: Promoter) => `https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Oi, ${p.name.split(" ")[0]}! Este é o seu acesso de promoter da casa: ${link(p)} . Por ele você vê sua lista VIP, valida presença e acompanha sua comissão.`)}`;

  return (
    <div className="space-y-6">
      <div className="card grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
        <input className="input" placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="WhatsApp" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input" aria-label="Comissão por convidado (R$)" inputMode="decimal" value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
        <button className="btn" disabled={!f.name || !f.phone} onClick={add}>Cadastrar</button>
        <p className="text-xs text-mut sm:col-span-4">Comissão em R$ por convidado que entrou na casa (validado na portaria ou por GPS).</p>
      </div>
      {msg && <p role="status" className="text-sm text-ok">{msg}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((p) => {
          const s = stats[p.id] ?? { total: 0, inside: 0 };
          const active = p.active ?? true;
          return (
            <li key={p.id} className={`card ${active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-semibold">{p.name}</div><div className="text-sm text-mut">{p.phone} · {brl(p.commission_cents)} por convidado</div></div>
                <button className="text-xs text-mut underline" onClick={() => toggle(p)}>{active ? "Desativar" : "Reativar"}</button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">Na lista</div><b>{s.total}</b></div>
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">Entraram</div><b>{s.inside}</b></div>
                <div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-mut">A pagar</div><b className="text-ok">{brl(s.inside * p.commission_cents)}</b></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => { navigator.clipboard.writeText(link(p)); setMsg(`Link de ${p.name} copiado.`); }}>Copiar link de acesso</button>
                {p.phone && <a className="btn flex-1 py-2 text-xs" href={wa(p)} target="_blank">Enviar no WhatsApp</a>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
