"use client";
import { useCallback, useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";

type O = { id: string; name: string; qty: number; table: string; status: "queued" | "preparing" | "ready"; created_at: string };
const COLS: { k: O["status"]; t: string; next: string }[] = [
  { k: "queued", t: "Na fila", next: "Preparar" }, { k: "preparing", t: "Preparando", next: "Pronto" }, { k: "ready", t: "Pronto", next: "Entregue" },
];

export default function OrdersBoard() {
  const [orders, setOrders] = useState<O[]>([]);
  const load = useCallback(async () => { const r = await fetch("/api/orders", { cache: "no-store" }); if (r.ok) setOrders((await r.json()).orders); }, []);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
  async function advance(o: O) {
    setOrders((x) => x.filter((y) => y.id !== o.id || o.status !== "ready").map((y) => y.id === o.id ? { ...y, status: o.status === "queued" ? "preparing" : "ready" } : y));
    await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, current: o.status }) });
    load();
  }
  const late = (o: O) => Date.now() - new Date(o.created_at).getTime() > 10 * 60_000;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {COLS.map((c) => (
        <div key={c.k} className="card">
          <div className="mb-2 flex justify-between text-sm font-bold"><span>{c.t}</span><span className="text-mut">{orders.filter((o) => o.status === c.k).length}</span></div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {orders.filter((o) => o.status === c.k).map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2 text-sm">
                <div className="flex-1"><b>{o.qty}x {o.name}</b><div className="text-xs text-mut">{o.table} · {fmtTime(o.created_at)} {late(o) && <span className="text-warn">· atrasado</span>}</div></div>
                <button className="pill bg-brand/20 px-3 py-1.5 text-brandl" onClick={() => advance(o)}>{c.next} ›</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
