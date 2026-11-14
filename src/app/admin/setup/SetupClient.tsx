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
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pix, setPix] = useState({ type: initial.pixKeyType || "CNPJ", key: "", auto: initial.payoutAuto });
  async function savePix() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(pix.key.trim() ? { type: pix.type, key: pix.key } : {}), auto: pix.auto }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Não foi possível salvar a chave.");
    setS({ ...s, pixKey: j.pix_key ?? s.pixKey, pixKeyType: j.pix_key_type ?? s.pixKeyType, payoutAuto: j.payout_auto !== false });
    setPix({ ...pix, key: "" }); setMsg("Chave Pix salva. Os repasses vão para ela.");
  }
  async function changePassword() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pw) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Não foi possível trocar a senha.");
    setPw({ current: "", next: "" }); setMsg("Senha trocada.");
  }
  const [hook, setHook] = useState(false);
  async function setupWebhook() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/asaas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, apiKey }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Não foi possível ligar o Pix.");
    setHook(true); setApiKey(""); setS({ ...s, payments: true, custody: false, paymentsSandbox: j.sandbox });
    setMsg(`Pix ligado${j.sandbox ? " em Sandbox (testes)" : ""}. O Asaas vai avisar cada pagamento em ${j.url}`);
  }

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

  const asaasForm = (
    <>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className="input py-2" type="password" autoComplete="off" placeholder={s.payments && !s.custody ? "Trocar a chave ($aact_...)" : "Chave de API do Asaas ($aact_...)"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <input className="input py-2" type="email" placeholder="E-mail para alertas do Asaas" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn py-2 sm:col-span-2" disabled={busy || !s.venue || ((!s.payments || s.custody) && !apiKey.trim())} onClick={setupWebhook}>{busy ? "Conferindo…" : s.payments && !s.custody ? (hook ? "Pix conferido ✓" : "Conferir e atualizar") : "Ligar minha conta Asaas"}</button>
      </div>
      <div className="mt-1 text-xs">Use a chave de produção (<code>$aact_prod_</code>).</div>
    </>
  );
  const ready = s.supabase && s.tables && s.venue && s.payments && (!s.custody || Boolean(s.pixKey));
  return (
    <div className="max-w-3xl space-y-6">
      <div className={`rounded-2xl border p-4 ${ready ? "border-ok/40 bg-ok/10" : s.mode === "demo" ? "border-warn/40 bg-warn/10" : "border-brand/40 bg-brand/10"}`}>
        <div className="font-semibold">{ready ? "Tudo pronto para operar." : s.mode === "demo" ? "Rodando em modo demonstração" : "Quase lá"}</div>
        <div className="mt-1 text-sm text-mut">{s.mode === "demo" ? "Os dados são fictícios e as ações ficam salvas só no navegador de cada visitante. Conecte o banco de dados para operar de verdade." : ready ? "Sua casa já pode vender ingressos e receber por Pix." : "Siga os itens abaixo para começar a vender."}</div>
      </div>

      <ol className="space-y-3">
        {s.root && <>
        <Row ok={s.supabase} title="Banco de dados (plataforma)">
          {s.supabase ? <>Conectado a <b className="text-white">{s.supabaseHost}</b>. {s.venues} casa(s) cadastrada(s).</> : <>Na Vercel: projeto → <b className="text-white">Storage</b> → <b className="text-white">Create Database</b> → <b className="text-white">Supabase</b> ou <b className="text-white">Neon</b> (plano grátis) → conecte ao projeto e faça um novo deploy.</>}
        </Row>
        <Row ok={s.tables} title="Tabelas (plataforma)">
          {s.tables ? "Criadas e atualizadas." : s.supabase ? (s.dbUrl ? "Clique para criar ou atualizar as tabelas." : "Falta a variável POSTGRES_URL. Ela é criada automaticamente pela integração de banco da Vercel.") : "Disponível depois de conectar o banco."}
          {s.supabase && s.dbUrl && <div className="mt-3"><button className="btn" disabled={busy} onClick={migrate}>{busy ? "Aplicando…" : s.tables ? "Atualizar tabelas" : "Criar tabelas"}</button></div>}
        </Row>
        <Row ok={s.split} title="Taxa por ingresso (split do Asaas)">
          {s.split ? "Ativo: a taxa da Casa Cheia sai de cada Pix direto para a carteira da plataforma." : "Sem ASAAS_SPLIT_WALLET_ID (walletId da conta Asaas da Casa Cheia), a taxa de cada ingresso fica registrada como \"a faturar\" e você cobra junto com a mensalidade."}
        </Row>
        <Row ok={s.billing} title="Mensalidade automática">
          {s.billing ? "Ativa: cada casa assina o plano e paga por Pix, boleto ou cartão na conta Asaas da Casa Cheia." : "Sem VIPFLOW_ASAAS_API_KEY (chave de API da conta Asaas da Casa Cheia), a mensalidade é cobrada por fora e nenhuma casa é pausada sozinha."}
        </Row>
        <Row ok={s.ai} title="IA para textos (Gemini)">
          {s.ai ? "Conectada." : "Opcional. Sem GEMINI_API_KEY, campanhas e convites usam textos prontos. A chave é grátis em aistudio.google.com."}
        </Row>
        <Row ok={s.cronSecret} title="Rotina diária">
          {s.cronSecret ? "Protegida por CRON_SECRET. Roda todo dia às 14h: convites VIP, Pix vencido e mensalidades." : "Defina CRON_SECRET para proteger a rotina diária."}
        </Row>
        </>}
        <Row ok={s.venue} title="1. Sua casa">
          {s.venue ? <>Cadastrada. Ajuste endereço, localização e mesas em <Link className="text-brandl underline" href="/admin/casa">Casa e mesas</Link>.</> : s.tables && s.root ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Nome da casa" value={venue.name} onChange={(e) => setVenue({ ...venue, name: e.target.value })} />
              <input className="input" placeholder="Cidade" value={venue.city} onChange={(e) => setVenue({ ...venue, city: e.target.value })} />
              <input className="input" placeholder="Endereço" value={venue.address} onChange={(e) => setVenue({ ...venue, address: e.target.value })} />
              <button className="btn sm:col-span-3" disabled={busy || !venue.name} onClick={createVenue}>Cadastrar casa</button>
            </div>
          ) : <>Crie a conta da casa em <Link className="text-brandl underline" href="/cadastro">Cadastro</Link>.</>}
        </Row>
        <Row ok={s.mode === "demo" || (s.payments && (!s.custody || Boolean(s.pixKey)))} title="2. Receber as vendas">
          {s.mode === "demo" ? "No modo demonstração os pagamentos são aprovados na hora, sem cobrar ninguém." : s.custody ? <>
            O cliente paga por Pix e o dinheiro entra na conta da Casa Cheia. Já descontadas a tarifa do Pix e a taxa do seu plano, a sua parte vai para a <b className="text-white">sua chave Pix</b>: sozinha todo dia, ou na hora pelo botão <b className="text-white">Receber agora</b> em Financeiro.
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <select className="input py-2" value={pix.type} onChange={(e) => setPix({ ...pix, type: e.target.value })} aria-label="Tipo da chave Pix">
                <option value="CNPJ">CNPJ</option><option value="CPF">CPF</option><option value="EMAIL">E-mail</option><option value="PHONE">Celular</option><option value="EVP">Chave aleatória</option>
              </select>
              <input className="input py-2 sm:col-span-2" placeholder={s.pixKey ? `Atual: ${s.pixKey}` : "Sua chave Pix"} value={pix.key} onChange={(e) => setPix({ ...pix, key: e.target.value })} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={pix.auto} onChange={(e) => setPix({ ...pix, auto: e.target.checked })} /> Repassar sozinho todo dia</label>
              <button className="btn py-2" disabled={busy || !s.venue || (!pix.key.trim() && pix.auto === s.payoutAuto)} onClick={savePix}>{s.pixKey ? "Salvar" : "Cadastrar chave"}</button>
            </div>
            {!s.pixKey && <div className="mt-1 text-xs text-warn">Você já pode vender. O dinheiro fica guardado até você cadastrar a chave.</div>}
            <details className="mt-3 text-xs"><summary className="cursor-pointer">Prefiro receber direto na minha própria conta Asaas</summary>
              <div className="mt-2">Com conta Asaas própria, o Pix cai na sua conta e a taxa da Casa Cheia sai automaticamente de cada venda. Em Integrações → Chaves de API, gere a chave e cole aqui.</div>
              {asaasForm}
            </details>
          </> : <>
            {s.payments
              ? <>Ligado {s.paymentsSandbox ? <b className="text-warn">em Sandbox (testes)</b> : <b className="text-ok">em produção</b>}. O Pix cai na hora, direto na conta Asaas da casa.</>
              : <>Enquanto o Pix não estiver ligado, a casa só distribui <b className="text-white">ingressos grátis</b>. Abra uma conta gratuita em asaas.com, vá em <b className="text-white">Integrações → Chaves de API</b>, gere a chave e cole aqui. Ela fica guardada cifrada.</>}
            {asaasForm}
          </>}
        </Row>
        {s.mode !== "demo" && !s.root && s.venue && (
          <Row ok title="Senha do painel">
            Portaria, bar e painel usam o mesmo login da casa.
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input className="input py-2" type="password" autoComplete="current-password" placeholder="Senha atual" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <input className="input py-2" type="password" autoComplete="new-password" placeholder="Senha nova (mín. 8)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <button className="btn py-2" disabled={busy || !pw.current || pw.next.length < 8} onClick={changePassword}>Trocar senha</button>
            </div>
          </Row>
        )}
        <Row ok={s.venue} title="3. Plano e taxas">
          Veja seu plano, quem paga a taxa do ingresso e a mensalidade em <Link className="text-brandl underline" href="/admin/plano">Plano</Link>.
        </Row>
      </ol>
      {s.root && <Link className="btn-ghost inline-flex" href="/plataforma">Abrir a visão da plataforma (todas as casas)</Link>}
      {msg && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm">{msg}</p>}
      {s.mode !== "demo" && <button className="text-sm text-mut underline" onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); location.href = "/"; }}>Sair do painel</button>}
      {s.venue && <div className="flex flex-wrap gap-2"><Link className="btn" href="/admin/eventos/novo">Criar evento</Link><Link className="btn-ghost" href="/admin/cardapio">Montar cardápio</Link><Link className="btn-ghost" href="/admin/promoters">Cadastrar promoters</Link></div>}
    </div>
  );
}
