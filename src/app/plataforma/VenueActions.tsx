"use client";
import { useState } from "react";

export default function VenueActions({ venueId, plan, status, plans }: { venueId: string; plan: string; status: string; plans: { id: string; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  const act = async (body: Record<string, unknown>, then?: string) => {
    setBusy(true);
    const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueId, ...body }) });
    if (!r.ok) { setBusy(false); return alert((await r.json().catch(() => ({}))).error ?? "Falhou"); }
    if (then) location.href = then; else location.reload();
  };
  async function reset() {
    if (!confirm("Gerar uma senha provisória para esta casa? A senha atual deixa de valer.")) return;
    setBusy(true);
    const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueId, action: "reset_password" }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return alert(j.error ?? "Falhou");
    prompt(`Senha provisória de ${j.email}. Copie e envie para a casa; ela troca em Configuração.`, j.password);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-ghost py-1.5 text-xs" disabled={busy} onClick={() => act({ action: "enter" }, "/admin")}>Abrir painel</button>
      <select className="input w-auto py-1.5 text-xs" aria-label="Plano" value={plan} disabled={busy} onChange={(e) => act({ action: "plan", plan: e.target.value })}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="input w-auto py-1.5 text-xs" aria-label="Situação" value={status} disabled={busy} onChange={(e) => act({ action: "status", status: e.target.value })}>
        <option value="trial">Grátis</option><option value="active">Em dia</option><option value="past_due">Atrasada</option><option value="blocked">Pausada</option>
      </select>
      <button className="btn-ghost py-1.5 text-xs" disabled={busy} onClick={() => act({ action: "extend", days: 30 })}>+30 dias grátis</button>
      <button className="btn-ghost py-1.5 text-xs" disabled={busy} onClick={reset}>Nova senha</button>
    </div>
  );
}
