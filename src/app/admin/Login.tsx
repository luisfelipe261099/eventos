"use client";
import { useState } from "react";
import { Logo } from "@/components/ui";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function go() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.reload(); else setErr("Senha incorreta");
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 px-6">
      <Logo h={40} />
      <h1 className="h-display mt-4 text-2xl">Painel do dono</h1>
      <input className="input" type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p className="text-sm text-bad">{err}</p>}
      <button className="btn" onClick={go}>Entrar</button>
    </main>
  );
}
