"use client";
import { useState } from "react";

export default function NewVenueForm({ plans }: { plans: { id: string; name: string }[] }) {
  const empty = { venue: "", city: "", name: "", email: "", phone: "", plan: plans[0]?.id ?? "", password: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ email: string; password: string; generated: boolean } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true); setErr("");
    const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_venue", venueId: "-", ...f }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Não foi possível cadastrar.");
    setDone({ email: f.email.trim().toLowerCase(), password: j.password, generated: j.generated }); setF(empty);
  }
  const msg = done && `Seu acesso à Casa Cheia: ${location.origin}/entrar\nE-mail: ${done.email}\nSenha: ${done.password}\nNo primeiro acesso, cadastre a chave Pix da casa em Configuração.`;
  return (
    <div className="card mt-3">
      {done ? (
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ok">Casa cadastrada.</p>
          <p>Envie para o dono (a senha só aparece agora):</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-xs">{msg}</pre>
          <div className="flex flex-wrap gap-2">
            <button className="btn py-2" onClick={() => navigator.clipboard.writeText(msg!)}>Copiar mensagem</button>
            <button className="btn-ghost py-2" onClick={() => location.reload()}>Pronto</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Nome da casa" value={f.venue} onChange={set("venue")} />
          <input className="input" placeholder="Cidade" value={f.city} onChange={set("city")} />
          <input className="input" placeholder="Nome do responsável" value={f.name} onChange={set("name")} />
          <input className="input" placeholder="WhatsApp com DDD" inputMode="tel" value={f.phone} onChange={set("phone")} />
          <input className="input" type="email" placeholder="E-mail de acesso" value={f.email} onChange={set("email")} />
          <select className="input" value={f.plan} onChange={set("plan")} aria-label="Plano">{plans.map((p) => <option key={p.id} value={p.id}>Plano {p.name}</option>)}</select>
          <input className="input sm:col-span-2" type="text" autoComplete="off" placeholder="Senha (deixe em branco para gerar uma)" value={f.password} onChange={set("password")} />
          {err && <p role="alert" className="text-sm text-bad sm:col-span-2">{err}</p>}
          <button className="btn sm:col-span-2" disabled={busy || !f.venue.trim() || !f.name.trim() || !f.email.includes("@") || f.phone.replace(/\D/g, "").length < 10} onClick={save}>{busy ? "Cadastrando…" : "Cadastrar casa"}</button>
        </div>
      )}
    </div>
  );
}
