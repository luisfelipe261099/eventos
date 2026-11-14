"use client";
import { useState } from "react";
import Link from "next/link";
import { brl } from "@/lib/format";

type Row = { id: string; value_cents: number; fee_cents: number; status: string; created_at: string; auto: boolean; fail_reason?: string | null };
const LABEL: Record<string, [string, string]> = {
  requested: ["Enviando", "text-warn"], pending: ["Enviando", "text-warn"], awaiting_authorization: ["Aguardando liberação", "text-warn"],
  done: ["Pago", "text-ok"], failed: ["Não enviado", "text-bad"], cancelled: ["Cancelado", "text-bad"],
};
const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Saldo a receber e repasses (recebimento pela conta da plataforma). */
export default function PayoutBox({ availableCents, minCents, pixKey, payouts, auto }: { availableCents: number; minCents: number; pixKey: string; payouts: Row[]; auto: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const open = payouts.some((p) => p.status === "requested" || p.status === "pending" || p.status === "awaiting_authorization");
  async function receive() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/payout", { method: "POST" });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Não foi possível pedir o repasse.");
    setMsg("Repasse pedido. O Pix chega na sua chave em instantes."); setTimeout(() => location.reload(), 1500);
  }
  return (
    <div className="card mt-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-mut">Saldo a receber</div>
          <div className={`text-3xl font-bold ${availableCents < 0 ? "text-bad" : "text-ok"}`}>{brl(availableCents)}</div>
          <div className="text-xs text-mut">{pixKey ? <>Vai para a chave Pix <b className="text-white">{pixKey}</b>{auto ? ", sozinho todo dia." : "."}</> : <>Cadastre a chave Pix em <Link className="text-brandl underline" href="/admin/setup">Configuração</Link> para receber.</>}</div>
        </div>
        <button className="btn" disabled={busy || open || !pixKey || availableCents < minCents} onClick={receive}>{busy ? "Pedindo…" : open ? "Repasse em andamento" : "Receber agora"}</button>
      </div>
      {availableCents < 0 && <p className="mt-2 text-xs text-bad">Saldo negativo por estorno de ingresso já repassado. Ele é descontado das próximas vendas.</p>}
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
      {payouts.length > 0 && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {payouts.slice(0, 8).map((p) => {
            const [label, tone] = LABEL[p.status] ?? [p.status, "text-mut"];
            return (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-28 text-mut">{dt(p.created_at)}</span>
                <span className="flex-1">{brl(p.value_cents)}{p.fee_cents ? <span className="text-xs text-mut"> (tarifa {brl(p.fee_cents)})</span> : null}{p.auto ? <span className="text-xs text-mut"> · automático</span> : null}</span>
                <span className={tone}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
