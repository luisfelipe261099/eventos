"use client";
import { useState } from "react";

/** Configuração única da conta Asaas da plataforma: webhook e validação de saque. */
export default function HooksSetup() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ webhook: string; saqueUrl: string; saqueToken: string } | null>(null);
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup_hooks", email }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Falhou");
    setRes(j);
  }
  return (
    <div className="card mt-4">
      <div className="font-semibold">Recebimento pela plataforma</div>
      <p className="mt-1 text-sm text-mut">Faça uma vez: liga o aviso de pagamentos e repasses da sua conta Asaas e mostra os dados da validação de saque.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input max-w-xs py-2" type="email" placeholder="E-mail para alertas do Asaas" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn py-2" disabled={busy || !email.includes("@")} onClick={go}>{busy ? "Configurando…" : "Configurar"}</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
      {res && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-ok">Webhook ligado: {res.webhook}</p>
          <p>Agora, no app ou site do Asaas: <b>Menu do usuário → Integrações → Mecanismos de segurança → Validação de saque via webhook</b>. Preencha:</p>
          <p>URL: <code className="select-all break-all text-white">{res.saqueUrl}</code></p>
          <p>Token de autenticação: <code className="select-all break-all text-white">{res.saqueToken}</code></p>
          <p className="text-mut">Com isso, os repasses saem sem precisar de código por SMS, e o Asaas recusa qualquer saque pela API que não tenha sido pedido pela Casa Cheia.</p>
        </div>
      )}
    </div>
  );
}
