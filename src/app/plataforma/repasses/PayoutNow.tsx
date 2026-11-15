"use client";
import { useState } from "react";

export default function PayoutNow({ venueId, disabled }: { venueId: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn py-2 text-sm" disabled={busy || disabled} onClick={async () => {
      if (!confirm("Repassar agora todo o saldo desta casa para a chave Pix dela?")) return;
      setBusy(true);
      const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "payout", venueId }) });
      const j = await r.json().catch(() => ({})); setBusy(false);
      if (!r.ok) return alert(j.error ?? "Falhou");
      location.reload();
    }}>{busy ? "Enviando…" : "Repassar agora"}</button>
  );
}
