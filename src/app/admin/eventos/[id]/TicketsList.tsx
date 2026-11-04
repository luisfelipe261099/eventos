"use client";
import { useMemo, useState } from "react";
import { brl } from "@/lib/format";

type Row = { id: string; name: string; phone: string; type: string; price_cents: number; status: string; created_at: string; is_free?: boolean };
const LABEL: Record<string, [string, string]> = {
  pending: ["Aguardando Pix", "bg-warn/20 text-warn"], paid: ["Pago", "bg-ok/20 text-ok"], used: ["Entrou", "bg-brand/20 text-brandl"],
  cancelled: ["Cancelado", "bg-white/10 text-mut"], refunded: ["Estornado", "bg-white/10 text-mut"],
};

export default function TicketsList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const list = useMemo(() => rows.filter((r) => !q || `${r.name} ${r.phone}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  async function act(r: Row, action: "cancel" | "refund") {
    const what = action === "refund" ? `Estornar ${brl(r.price_cents)} para ${r.name}? O valor volta para o cliente e a vaga é liberada.` : `Cancelar o ingresso de ${r.name}?`;
    if (!confirm(what)) return;
    setBusy(r.id); setMsg("");
    const res = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, action }) });
    const j = await res.json(); setBusy(null);
    if (!res.ok) return setMsg(j.error);
    setRows(rows.map((x) => (x.id === r.id ? { ...x, status: j.status } : x)));
    setMsg(action === "refund" ? "Estorno solicitado." : "Ingresso cancelado.");
  }

  return (
    <div className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="h-display text-xl">Ingressos ({rows.length})</h2>
        <input className="input max-w-xs py-2" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {msg && <p role="status" className="mb-2 text-sm text-ok">{msg}</p>}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/5 text-left text-xs text-mut"><tr><th className="p-3">Cliente</th><th className="p-3">Lote</th><th className="p-3">Valor</th><th className="p-3">Situação</th><th className="p-3" /></tr></thead>
          <tbody>
            {list.slice(0, 300).map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-3"><div className="font-medium">{r.name}</div><div className="text-xs text-mut">{r.phone}</div></td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.is_free ? "Cortesia" : brl(r.price_cents)}</td>
                <td className="p-3"><span className={`pill ${LABEL[r.status]?.[1] ?? ""}`}>{LABEL[r.status]?.[0] ?? r.status}</span></td>
                <td className="p-3 text-right">
                  {r.status === "pending" && <button className="text-xs text-mut underline" disabled={busy === r.id} onClick={() => act(r, "cancel")}>Cancelar</button>}
                  {r.status === "paid" && <button className="text-xs text-bad underline" disabled={busy === r.id} onClick={() => act(r, "refund")}>{r.price_cents > 0 ? "Estornar" : "Cancelar cortesia"}</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-mut">Nenhum ingresso{q ? " encontrado" : " vendido ainda"}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
