"use client";
import { useState } from "react";

export default function LeadForm() {
  const [f, setF] = useState({ name: "", venue: "", phone: "", city: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function send() {
    setState("busy"); setErr("");
    const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) return setState("done");
    setState("idle"); setErr((await r.json().catch(() => ({}))).error ?? "Não foi possível enviar. Tente de novo.");
  }
  if (state === "done") return <p role="status" className="mt-5 rounded-2xl bg-papel p-4 font-medium">Recebido. Vamos chamar você no WhatsApp.</p>;
  return (
    <div className="mt-4 space-y-3">
      <input className="field" placeholder="Seu nome" autoComplete="name" value={f.name} onChange={set("name")} />
      <input className="field" placeholder="Nome da casa" value={f.venue} onChange={set("venue")} />
      <input className="field" placeholder="WhatsApp com DDD" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
      <input className="field" placeholder="Cidade" value={f.city} onChange={set("city")} />
      {err && <p role="alert" className="text-sm font-medium text-[#c22a3a]">{err}</p>}
      <button className="btn-dark w-full" disabled={state === "busy" || !f.name.trim() || f.phone.replace(/\D/g, "").length < 10} onClick={send}>{state === "busy" ? "Enviando…" : "Quero que me chamem"}</button>
    </div>
  );
}
