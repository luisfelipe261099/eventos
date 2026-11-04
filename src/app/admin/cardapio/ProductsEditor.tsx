"use client";
import { useState } from "react";
import type { Product } from "@/lib/types";

const CATS = ["Drinks", "Cervejas", "Combos", "Petiscos", "Garrafas"] as const;
type Row = Product & { price: string; cost: string; dirty?: boolean; saving?: boolean; error?: string };
const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const toCents = (v: string) => Math.round(parseFloat(v.replace(/\./g, "").replace(",", ".")) * 100) || 0;
const blank = (): Row => ({ id: "", venue_id: "", name: "", category: "Drinks", price_cents: 0, cost_cents: 0, stock: 0, active: true, price: "", cost: "", dirty: true });

export default function ProductsEditor({ initial, venueSlug }: { initial: Product[]; venueSlug: string }) {
  const [rows, setRows] = useState<Row[]>(initial.map((p) => ({ ...p, price: reais(p.price_cents), cost: reais(p.cost_cents) })));
  const upd = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch, dirty: true } : x)));

  async function save(i: number) {
    const r = rows[i];
    setRows((x) => x.map((y, j) => (j === i ? { ...y, saving: true, error: undefined } : y)));
    const res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id || undefined, name: r.name, category: r.category, price_cents: toCents(r.price), cost_cents: toCents(r.cost), stock: Number(r.stock), active: r.active }) });
    const j = await res.json();
    setRows((x) => x.map((y, k) => (k === i ? (res.ok ? { ...y, id: j.id, dirty: false, saving: false } : { ...y, saving: false, error: j.error }) : y)));
  }

  const margin = (r: Row) => { const p = toCents(r.price), c = toCents(r.cost); return p ? Math.round(((p - c) / p) * 100) : 0; };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mut">O custo é usado pela IA para sugerir promoções sem perder margem. Itens desativados somem do cardápio.</p>
        <div className="flex gap-2">
          {venueSlug && <a className="btn-ghost text-sm" href={`/cardapio/${venueSlug}`} target="_blank">Ver cardápio</a>}
          <button className="btn text-sm" onClick={() => setRows([blank(), ...rows])}>+ Novo produto</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-white/5 text-left text-xs text-mut"><tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Preço (R$)</th><th className="p-3">Custo (R$)</th><th className="p-3">Margem</th><th className="p-3">Estoque</th><th className="p-3">Ativo</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || `new-${i}`} className="border-t border-line align-top">
                <td className="p-2"><input className="input py-2" value={r.name} placeholder="Nome" onChange={(e) => upd(i, { name: e.target.value })} />{r.error && <div className="mt-1 text-xs text-bad">{r.error}</div>}</td>
                <td className="p-2"><select className="input py-2" value={r.category} onChange={(e) => upd(i, { category: e.target.value as Product["category"] })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></td>
                <td className="p-2"><input className="input w-24 py-2" inputMode="decimal" value={r.price} onChange={(e) => upd(i, { price: e.target.value })} /></td>
                <td className="p-2"><input className="input w-24 py-2" inputMode="decimal" value={r.cost} onChange={(e) => upd(i, { cost: e.target.value })} /></td>
                <td className={`p-3 font-semibold ${margin(r) < 30 ? "text-warn" : "text-ok"}`}>{margin(r)}%</td>
                <td className="p-2"><input className="input w-20 py-2" type="number" value={r.stock} onChange={(e) => upd(i, { stock: Number(e.target.value) })} /></td>
                <td className="p-3"><input type="checkbox" className="h-5 w-5 accent-[#b14dff]" checked={r.active} onChange={(e) => upd(i, { active: e.target.checked })} aria-label="Produto ativo" /></td>
                <td className="p-2">{r.dirty ? <button className="btn py-2 text-xs" disabled={r.saving || !r.name} onClick={() => save(i)}>{r.saving ? "…" : "Salvar"}</button> : <span className="text-xs text-ok">Salvo</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-mut">Nenhum produto ainda. Clique em “Novo produto”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
