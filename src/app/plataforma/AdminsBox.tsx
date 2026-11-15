"use client";
import { useState } from "react";

/** Administradores da plataforma: criar outro ou trocar a senha de um existente. */
export default function AdminsBox({ admins }: { admins: { id: string; email: string }[] }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function save() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", ...f }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Falhou");
    setMsg("Salvo."); setF({ email: "", password: "" }); setTimeout(() => location.reload(), 800);
  }
  return (
    <div className="card mt-4">
      <div className="font-semibold">Administradores</div>
      <ul className="mt-2 text-sm text-mut">{admins.map((a) => <li key={a.id}>{a.email}</li>)}{admins.length === 0 && <li>Nenhum ainda.</li>}</ul>
      <p className="mt-3 text-sm text-mut">Para trocar a senha, informe o mesmo e-mail com a senha nova.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input className="input py-2" type="email" autoComplete="off" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="input py-2" type="password" autoComplete="new-password" placeholder="Senha (mín. 8)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn py-2" disabled={busy || !f.email.includes("@") || f.password.length < 8} onClick={save}>Salvar administrador</button>
      </div>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
