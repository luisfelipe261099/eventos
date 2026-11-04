"use client";
import { useState } from "react";

type R = { event: string | null; invited: { customer: string; message: string; sent: boolean; link: string }[] };

export default function InvitesButton() {
  const [r, setR] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() { setBusy(true); const x = await fetch("/api/invites/run", { method: "POST" }); setBusy(false); if (x.ok) setR(await x.json()); }
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm"><b>Convites VIP automáticos</b><div className="text-xs text-mut">Roda sozinho todo dia às 14h (Vercel Cron). Você também pode disparar agora.</div></div>
        <button className="btn" disabled={busy} onClick={run}>{busy ? "Enviando…" : "🎟️ Enviar convites agora"}</button>
      </div>
      {r && (
        <div className="mt-3 space-y-2">
          {r.invited.length === 0 && <p className="text-sm text-mut">Todos os VIPs já foram convidados para este evento.</p>}
          {r.invited.map((i) => (
            <div key={i.customer} className="rounded-xl bg-[#1d3a2c] p-3 text-sm text-[#e6f7ee]">
              <b>{i.customer}</b>: {i.message}
              {!i.sent && <a className="mt-2 block font-bold text-ok underline" href={i.link} target="_blank">Enviar pelo WhatsApp ›</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
