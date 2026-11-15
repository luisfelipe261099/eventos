"use client";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
    if (r.ok) { const j = await r.json().catch(() => ({})); location.href = j.root ? "/plataforma" : location.pathname.startsWith("/admin") || location.pathname.startsWith("/plataforma") || location.pathname.startsWith("/bar") ? location.pathname : "/admin"; return; }
    setBusy(false); setErr((await r.json().catch(() => ({}))).error ?? "Não foi possível entrar");
  }
  return (
    <div className="op"><main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 px-6">
      <a href="/" className="mb-6 text-sm text-mut hover:text-white">← Voltar ao site</a>
      <Logo h={40} />
      <h1 className="h-display mt-4 text-2xl">Entrar</h1>
      <p className="text-sm text-mut">Painel da casa ou administração da plataforma.</p>
      <input className="input" type="email" autoComplete="username" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" autoComplete="current-password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <button className="btn" disabled={busy || !pw} onClick={go}>{busy ? "Entrando…" : "Entrar"}</button>
      <p className="mt-2 text-sm text-mut">Ainda não usa a Casa Cheia? <Link className="text-brandl underline" href="/cadastro">Crie a conta da sua casa</Link>: 30 dias grátis.</p>
      <p className="text-xs text-mut">Esqueceu a senha? Peça uma nova para a Casa Cheia.</p>
    </main></div>
  );
}
