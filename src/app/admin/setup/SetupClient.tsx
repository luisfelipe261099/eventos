"use client";
import { useState } from "react";
import Link from "next/link";
import type { SetupStatus } from "@/lib/setup";

function Row({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="card flex gap-4">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok ? "bg-ok/20 text-ok" : "bg-warn/20 text-warn"}`}>{ok ? "✓" : "!"}</span>
      <div className="min-w-0 flex-1"><div className="font-semibold">{title}</div><div className="mt-1 text-sm text-mut">{children}</div></div>
    </li>
  );
}

export default function SetupClient({ initial }: { initial: SetupStatus }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [venue, setVenue] = useState({ name: "", city: "Curitiba", address: "" });

  async function migrate() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/setup", { method: "POST" }); const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Falha ao criar as tabelas.");
    setS(j.status); setMsg(j.applied.length ? `Pronto: ${j.applied.length} etapa(s) aplicada(s).` : "As tabelas já estavam atualizadas.");
  }
  async function createVenue() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/venue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(venue) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Não foi possível salvar a casa.");
    setS({ ...s, venue: true }); setMsg("Casa cadastrada. Agora ajuste a localização em Casa e mesas e crie o primeiro evento.");
  }

  const ready = s.supabase && s.tables && s.venue && s.adminPassword;
  return (
    <div className="max-w-3xl space-y-6">
      <div className={`rounded-2xl border p-4 ${ready ? "border-ok/40 bg-ok/10" : s.mode === "demo" ? "border-warn/40 bg-warn/10" : "border-brand/40 bg-brand/10"}`}>
        <div className="font-semibold">{ready ? "Tudo pronto para operar." : s.mode === "demo" ? "Rodando em modo demonstração" : "Quase lá"}</div>
        <div className="mt-1 text-sm text-mut">{s.mode === "demo" ? "Os dados são fictícios e as ações ficam salvas só no navegador de cada visitante. Conecte o Supabase para operar de verdade." : "Conectado ao Supabase. Siga os itens abaixo."}</div>
      </div>

      <ol className="space-y-3">
        <Row ok={s.supabase} title="1. Banco de dados (Supabase)">
          {s.supabase ? <>Conectado ao projeto <b className="text-white">{s.supabaseHost}</b>.</> : <>Na Vercel: projeto → <b className="text-white">Storage</b> → <b className="text-white">Create Database</b> → <b className="text-white">Supabase</b> (plano grátis) → conecte ao projeto e faça um novo deploy.</>}
        </Row>
        <Row ok={s.tables} title="2. Tabelas">
          {s.tables ? "Criadas e atualizadas." : s.supabase ? (s.dbUrl ? "Clique para criar as tabelas no Supabase." : "Falta a variável POSTGRES_URL. Ela é criada automaticamente pela integração Supabase da Vercel.") : "Disponível depois de conectar o banco."}
          {s.supabase && s.dbUrl && <div className="mt-3"><button className="btn" disabled={busy} onClick={migrate}>{busy ? "Aplicando…" : s.tables ? "Atualizar tabelas" : "Criar tabelas"}</button></div>}
        </Row>
        <Row ok={s.venue} title="3. Sua casa">
          {s.venue ? <>Cadastrada. Ajuste endereço, localização e mesas em <Link className="text-brandl underline" href="/admin/casa">Casa e mesas</Link>.</> : s.tables ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Nome da casa" value={venue.name} onChange={(e) => setVenue({ ...venue, name: e.target.value })} />
              <input className="input" placeholder="Cidade" value={venue.city} onChange={(e) => setVenue({ ...venue, city: e.target.value })} />
              <input className="input" placeholder="Endereço" value={venue.address} onChange={(e) => setVenue({ ...venue, address: e.target.value })} />
              <button className="btn sm:col-span-3" disabled={busy || !venue.name} onClick={createVenue}>Cadastrar casa</button>
            </div>
          ) : "Disponível depois de criar as tabelas."}
        </Row>
        <Row ok={s.adminPassword} title="4. Senha do painel">
          {s.adminPassword ? "Definida (variável ADMIN_PASSWORD). Portaria, bar e painel pedem essa senha." : "Defina ADMIN_PASSWORD nas variáveis de ambiente da Vercel. Sem ela, o painel fica aberto."}
        </Row>
        <Row ok={s.payments} title="5. Pix (Mercado Pago)">
          {s.payments ? "Conectado. O dinheiro cai direto na conta da casa." : "Opcional para testar. Sem MP_ACCESS_TOKEN, os pagamentos são aprovados automaticamente (modo teste). Crie as credenciais em mercadopago.com.br/developers."}
        </Row>
        <Row ok={s.ai} title="6. IA para textos (Gemini)">
          {s.ai ? "Conectada." : "Opcional. Sem GEMINI_API_KEY, campanhas e convites usam textos prontos. A chave é grátis em aistudio.google.com."}
        </Row>
        <Row ok={s.cronSecret} title="7. Convites automáticos">
          {s.cronSecret ? "Protegidos por CRON_SECRET. Rodam todo dia às 14h." : "Defina CRON_SECRET para proteger a rotina diária de convites VIP."}
        </Row>
      </ol>
      {msg && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm">{msg}</p>}
      {s.venue && <div className="flex flex-wrap gap-2"><Link className="btn" href="/admin/eventos/novo">Criar evento</Link><Link className="btn-ghost" href="/admin/cardapio">Montar cardápio</Link><Link className="btn-ghost" href="/admin/promoters">Cadastrar promoters</Link></div>}
    </div>
  );
}
