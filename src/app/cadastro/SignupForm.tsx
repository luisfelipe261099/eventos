"use client";
import { useState } from "react";

export default function SignupForm({ plans, initialPlan }: { plans: { id: string; name: string }[]; initialPlan: string }) {
  const [f, setF] = useState({ venue: "", city: "", name: "", email: "", phone: "", password: "", plan: initialPlan });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) { location.href = "/admin/setup"; return; }
    setBusy(false); setErr((await r.json().catch(() => ({}))).error ?? "Não foi possível criar a conta. Tente de novo.");
  }
  const L = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}</label>;
  return (
    <form onSubmit={go} className="mt-6 space-y-3 pb-10">
      {L({ label: "Nome da casa", children: <input className="field" required value={f.venue} onChange={set("venue")} /> })}
      {L({ label: "Cidade", children: <input className="field" autoComplete="address-level2" value={f.city} onChange={set("city")} /> })}
      {L({ label: "Seu nome", children: <input className="field" required autoComplete="name" value={f.name} onChange={set("name")} /> })}
      {L({ label: "E-mail (será o login)", children: <input className="field" required type="email" autoComplete="email" value={f.email} onChange={set("email")} /> })}
      {L({ label: "WhatsApp com DDD", children: <input className="field" required inputMode="tel" autoComplete="tel" placeholder="(41) 90000-0000" value={f.phone} onChange={set("phone")} /> })}
      {L({ label: "Senha (mínimo de 8 caracteres)", children: <input className="field" required minLength={8} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} /> })}
      {L({ label: "Plano", children: <select className="field" value={f.plan} onChange={set("plan")}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select> })}
      {err && <p role="alert" className="text-sm font-medium text-[#c22a3a]">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Criando…" : "Criar conta e começar"}</button>
      <p className="text-xs text-nevoa">Ao criar a conta, você concorda com os <a href="/termos" className="underline">termos</a> e a <a href="/privacidade" className="underline">política de privacidade</a>.</p>
    </form>
  );
}
