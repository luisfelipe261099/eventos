"use client";
import { useCallback, useEffect, useState } from "react";
import { brl, fmtTime } from "@/lib/format";
import { Pill } from "@/components/ui";

type Line = { id: string; name: string; qty: number; unit_price_cents: number; status: string; created_at: string };
type TabData = { tab: { id: string; table_label: string; status: string }; lines: Line[]; subtotal: number; service: number; total: number };

const STATUS: Record<string, { t: string; tone: "ok" | "warn" | "mut" | "brand" }> = {
  queued: { t: "Na fila", tone: "mut" }, preparing: { t: "Preparando", tone: "warn" }, ready: { t: "Pronto!", tone: "brand" }, delivered: { t: "Entregue", tone: "ok" }, cancelled: { t: "Cancelado", tone: "mut" },
};

export default function TabView({ id }: { id: string }) {
  const [data, setData] = useState<TabData | null>(null);
  const [err, setErr] = useState("");
  const [people, setPeople] = useState(1);
  const [paying, setPaying] = useState(false);
  const [pix, setPix] = useState<{ qrCode?: string; qrCodeBase64?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/tabs/${id}`, { cache: "no-store" });
    if (!r.ok) return setErr("Comanda não encontrada");
    setData(await r.json());
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function pay() {
    setPaying(true);
    const j = await fetch(`/api/tabs/${id}/pay`, { method: "POST" }).then((r) => r.json());
    setPaying(false);
    if (j.pix?.status === "approved" || j.status === "approved") { localStorage.removeItem("vf_tab"); load(); }
    else setPix(j.pix);
  }

  if (err) return <p className="text-bad">{err}</p>;
  if (!data) return <p className="text-mut">Carregando…</p>;
  const paid = data.tab.status === "paid";
  return (
    <div className="space-y-3">
      <div className="text-sm text-mut">{data.tab.table_label} · #{data.tab.id.slice(-4).toUpperCase()}</div>
      {data.lines.map((l) => (
        <div key={l.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex-1"><div className="font-semibold">{l.qty}x {l.name}</div><div className="text-xs text-mut">{fmtTime(l.created_at)} · {brl(l.qty * l.unit_price_cents)}</div></div>
          <Pill tone={STATUS[l.status]?.tone}>{STATUS[l.status]?.t ?? l.status}</Pill>
        </div>
      ))}
      <div className="card space-y-1 text-sm">
        <div className="flex justify-between text-mut"><span>Subtotal</span><span>{brl(data.subtotal)}</span></div>
        <div className="flex justify-between text-mut"><span>Serviço (10%)</span><span>{brl(data.service)}</span></div>
        <div className="flex justify-between pt-1 text-lg font-bold"><span>Total</span><span>{brl(data.total)}</span></div>
        {people > 1 && <div className="flex justify-between text-brandl"><span>Por pessoa ({people})</span><span>{brl(Math.ceil(data.total / people))}</span></div>}
      </div>
      {paid ? (
        <div className="card text-center font-bold text-ok">✓ Comanda paga. Obrigado!</div>
      ) : pix ? (
        <div className="card text-center">
          {pix.qrCodeBase64 && <img alt="Pix" className="mx-auto w-52 rounded-xl bg-white p-2" src={`data:image/png;base64,${pix.qrCodeBase64}`} />}
          {pix.qrCode && <button className="btn-ghost mt-2 w-full text-xs" onClick={() => navigator.clipboard.writeText(pix.qrCode!)}>Copiar código Pix</button>}
        </div>
      ) : (
        <>
          <button className="btn w-full" onClick={pay} disabled={paying || data.total === 0}>{paying ? "Gerando Pix…" : `Pagar com Pix · ${brl(data.total)}`}</button>
          <div className="flex items-center justify-between rounded-xl border border-line p-2 text-sm">
            <span className="pl-2 text-mut">Dividir conta</span>
            <div className="flex items-center gap-2"><button className="h-8 w-8 rounded-lg bg-white/10" onClick={() => setPeople(Math.max(1, people - 1))}>–</button><b>{people}</b><button className="h-8 w-8 rounded-lg bg-white/10" onClick={() => setPeople(people + 1)}>+</button></div>
          </div>
          <button onClick={() => history.back()} className="block w-full text-center text-sm text-brandl">+ Pedir mais</button>
        </>
      )}
    </div>
  );
}
