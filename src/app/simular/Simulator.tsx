"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { makeQrPayload } from "@/lib/qr";
import { brl } from "@/lib/format";

type Frame = "cliente" | "equipe" | "dono";
type Props = { eventId: string; eventSlug: string; eventName: string; ticketTypeId: string; ticketPrice: number; venueSlug: string; live: boolean };
type Log = { at: string; who: Frame; text: string };

const LABEL: Record<Frame, string> = { cliente: "Celular do cliente", equipe: "Equipe: portaria e bar", dono: "Painel do dono" };
const PROFILE = { name: "Você (simulação)", phone: "+5541900001234" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const json = (url: string, body?: unknown, method = body ? "POST" : "GET") =>
  fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

function Phone({ frame, src, k, scale, highlight }: { frame: Frame; src: string; k: number; scale: number; highlight: boolean }) {
  return (
    <figure className="shrink-0">
      <figcaption className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2 w-2 rounded-full ${highlight ? "bg-violeta" : "bg-linha"}`} />{LABEL[frame]}
      </figcaption>
      <div className={`overflow-hidden rounded-[34px] border-[6px] bg-breu transition-colors ${highlight ? "border-violeta" : "border-breu"}`} style={{ width: 390 * scale + 12, height: 844 * scale + 12 }}>
        <iframe key={`${src}-${k}`} src={src} title={LABEL[frame]} className="origin-top-left bg-papel" style={{ width: 390, height: 844, transform: `scale(${scale})` }} />
      </div>
      <div className="mt-1.5 max-w-[300px] truncate text-xs text-nevoa">{src.split("?")[0]}</div>
    </figure>
  );
}

export default function Simulator(p: Props) {
  const [frames, setFrames] = useState<Record<Frame, string>>({ cliente: `/e/${p.eventSlug}`, equipe: "/portaria", dono: "/admin" });
  const [keys, setKeys] = useState<Record<Frame, number>>({ cliente: 0, equipe: 0, dono: 0 });
  const [focus, setFocus] = useState<Frame>("cliente");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const [err, setErr] = useState("");
  const [scale, setScale] = useState(0.68);
  const [mobile, setMobile] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // escala dos celulares conforme a tela
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth; const m = w < 1024; setMobile(m);
      setScale(m ? Math.min(1, (w - 44) / 390) : Math.min(0.72, (w - 460) / (390 * 3 + 80)));
    };
    fit(); addEventListener("resize", fit); return () => removeEventListener("resize", fit);
  }, []);

  const go = (f: Frame, src: string) => { setFrames((x) => ({ ...x, [f]: src })); setKeys((k) => ({ ...k, [f]: k[f] + 1 })); };
  const reload = (f: Frame) => setKeys((k) => ({ ...k, [f]: k[f] + 1 }));
  const say = (who: Frame, text: string) => setLog((l) => [{ at: now(), who, text }, ...l]);

  // detecta quando você mesmo compra ou pede pelos celulares
  useEffect(() => {
    const t = setInterval(() => {
      const tk = JSON.parse(localStorage.getItem("vf_tickets") ?? "[]")[0] ?? null;
      const tb = localStorage.getItem("vf_tab");
      if (tk && tk !== ticketId) { setTicketId(tk); if (step === 0) { say("cliente", "Ingresso comprado pelo celular do cliente."); setStep(1); reload("dono"); } }
      if (tb && tb !== tabId) { setTabId(tb); if (step === 2) { say("cliente", "Pedido enviado pelo cardápio digital."); setStep(3); go("equipe", "/bar"); reload("dono"); } }
    }, 1000);
    return () => clearInterval(t);
  });

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr("");
    if (mobile) setTimeout(() => wrap.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Algo deu errado nesta etapa. Tente de novo."); }
    setBusy(false);
  }

  const steps = [
    {
      title: "Comprar o ingresso",
      desc: `O cliente escolhe a ${p.eventName}, paga ${brl(p.ticketPrice)} no Pix e recebe o ingresso com QR code dinâmico. Na demo, o Pix é aprovado na hora.`,
      cta: "Comprar ingresso", who: "cliente" as Frame,
      act: () => run(async () => {
        setFocus("cliente");
        const r = await json("/api/tickets", { eventId: p.eventId, ticketTypeId: p.ticketTypeId, ...PROFILE });
        if (!r.ok) throw new Error(r.data.error ?? "Não foi possível comprar.");
        localStorage.setItem("vf_profile", JSON.stringify(PROFILE));
        localStorage.setItem("vf_tickets", JSON.stringify([r.data.ticketId]));
        setTicketId(r.data.ticketId);
        go("cliente", `/ingresso/${r.data.ticketId}`);
        say("cliente", `Pix aprovado. Ingresso emitido (${brl(p.ticketPrice)}). O dinheiro vai direto para a conta da casa.`);
        reload("dono"); setStep(1);
      }),
    },
    {
      title: "Entrar na festa",
      desc: "A portaria lê o QR do celular do cliente. A validação acontece no aparelho da porta, em milissegundos, mesmo sem internet. Depois, o check-in é enviado para o painel.",
      cta: "Ler o QR na portaria", who: "equipe" as Frame,
      act: () => run(async () => {
        setFocus("equipe");
        if (!ticketId) throw new Error("Compre o ingresso primeiro.");
        let seed = localStorage.getItem(`vf_seed_${ticketId}`);
        for (let i = 0; !seed && i < 10; i++) { await sleep(500); seed = localStorage.getItem(`vf_seed_${ticketId}`); }
        if (!seed) throw new Error("Abra o ingresso no celular do cliente para gerar o QR.");
        const code = await makeQrPayload(ticketId, seed);
        go("equipe", `/portaria?code=${encodeURIComponent(code)}`);
        say("equipe", "QR lido na portaria: acesso liberado.");
        await sleep(3500); reload("cliente"); reload("dono");
        say("dono", "Check-in apareceu no painel (público na casa +1).");
        setStep(2);
      }),
    },
    {
      title: "Pedir pelo cardápio",
      desc: "Já dentro, o cliente abre o cardápio da Mesa 12 e pede 2 gin tônicas e uma porção de fritas. O pedido cai na comanda dele e na tela do bar.",
      cta: "Fazer o pedido", who: "cliente" as Frame,
      act: () => run(async () => {
        setFocus("cliente");
        const r = await json("/api/tabs", { tabId, table: "Mesa 12", ...PROFILE, items: [{ productId: "p-gin", qty: 2 }, { productId: "p-fritas", qty: 1 }] });
        if (!r.ok) throw new Error(r.data.error ?? "O pedido não foi enviado.");
        localStorage.setItem("vf_tab", r.data.tabId); setTabId(r.data.tabId);
        go("cliente", `/comanda/${r.data.tabId}`); go("equipe", "/bar");
        say("cliente", "Pedido enviado: 2 gin tônicas e 1 porção de fritas (Mesa 12).");
        reload("dono"); setStep(3);
      }),
    },
    {
      title: "Bar prepara e entrega",
      desc: "Na tela do bar, a equipe move o pedido de \"Na fila\" para \"Preparando\" e depois para \"Pronto\". O cliente acompanha cada mudança na comanda, em tempo real.",
      cta: "Preparar e entregar", who: "equipe" as Frame,
      act: () => run(async () => {
        setFocus("equipe");
        if (!tabId) throw new Error("Faça o pedido primeiro.");
        go("equipe", "/bar");
        const t = await json(`/api/tabs/${tabId}`);
        const lines: { id: string; status: string; name: string }[] = t.data.lines ?? [];
        for (const [from, label] of [["queued", "Preparando"], ["preparing", "Pronto para retirar"], ["ready", "Entregue"]] as const) {
          for (const l of lines.filter((x) => x.status === from)) { await json("/api/orders", { id: l.id, current: from }, "PATCH"); l.status = from === "queued" ? "preparing" : from === "preparing" ? "ready" : "delivered"; }
          say("equipe", `Pedido marcado como “${label}”.`);
          await sleep(3500);
        }
        reload("dono"); setStep(4);
      }),
    },
    {
      title: "Pagar a comanda",
      desc: "O cliente fecha a conta pelo celular com Pix, sem fila no caixa. Também dá para dividir o valor entre amigos.",
      cta: "Pagar com Pix", who: "cliente" as Frame,
      act: () => run(async () => {
        setFocus("cliente");
        if (!tabId) throw new Error("Faça o pedido primeiro.");
        const r = await json(`/api/tabs/${tabId}/pay`, {});
        if (!r.ok) throw new Error(r.data.error ?? "Pagamento não concluído.");
        localStorage.removeItem("vf_tab");
        reload("cliente"); reload("dono");
        say("cliente", "Comanda paga com Pix.");
        setStep(5);
      }),
    },
    {
      title: "O dono vê tudo e a IA age",
      desc: "No painel, o dono vê público, vendas do bar e o ranking de produtos. A IA identifica os clientes VIP (como o Rafael, que gasta R$ 5 mil toda sexta) e prepara os convites com ingresso free.",
      cta: "Rodar a IA de convites", who: "dono" as Frame,
      act: () => run(async () => {
        setFocus("dono");
        const r = await json("/api/invites/run", {});
        if (!r.ok) throw new Error(r.data.error ?? "A IA não rodou.");
        const inv: { customer: string; message: string }[] = r.data.invited ?? [];
        if (inv.length === 0) say("dono", "Os VIPs já tinham recebido convite para este evento.");
        inv.slice(0, 3).forEach((i) => say("dono", `Convite para ${i.customer}: “${i.message}”`));
        go("dono", "/admin#clientes");
        setStep(6);
      }),
    },
  ];

  async function restart() {
    await fetch("/api/sim/reset", { method: "POST" });
    Object.keys(localStorage).filter((k) => k.startsWith("vf_")).forEach((k) => localStorage.removeItem(k));
    setTicketId(null); setTabId(null); setLog([]); setStep(0); setErr(""); setFocus("cliente");
    setFrames({ cliente: `/e/${p.eventSlug}`, equipe: "/portaria", dono: "/admin" });
    setKeys((k) => ({ cliente: k.cliente + 1, equipe: k.equipe + 1, dono: k.dono + 1 }));
  }

  const done = step >= steps.length;
  const visible: Frame[] = mobile ? [focus] : ["cliente", "equipe", "dono"];

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 lg:flex lg:gap-8">
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:w-[380px] lg:shrink-0 lg:overflow-y-auto">
        <h1 className="poster text-[40px] uppercase">Simule uma noite</h1>
        <p className="mt-2 text-[15px] text-tinta/80">Acompanhe o cliente da compra do ingresso até o pagamento da comanda, com a portaria, o bar e o painel do dono reagindo ao mesmo tempo. Você pode clicar nos botões abaixo ou usar os celulares você mesmo.</p>
        {!p.live && <p className="mt-2 text-xs text-nevoa">Seus dados de simulação ficam só neste navegador.</p>}

        <ol className="mt-6 space-y-2">
          {steps.map((s, i) => {
            const state = i < step ? "done" : i === step ? "now" : "next";
            return (
              <li key={s.title} className={`rounded-2xl border p-4 transition-colors ${state === "now" ? "border-violeta bg-white" : "border-linha bg-white/60"}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${state === "done" ? "bg-verde text-white" : state === "now" ? "bg-violeta text-white" : "bg-linha text-nevoa"}`}>{state === "done" ? "✓" : i + 1}</span>
                  <span className={`font-semibold ${state === "next" ? "text-nevoa" : ""}`}>{s.title}</span>
                  <button onClick={() => setFocus(s.who)} className="ml-auto text-xs text-nevoa underline-offset-2 hover:underline lg:hidden">ver tela</button>
                </div>
                {state === "now" && (
                  <div className="mt-3 pl-10">
                    <p className="text-sm leading-relaxed text-tinta/80">{s.desc}</p>
                    <button className="btn-primary mt-3" disabled={busy} onClick={s.act}>{busy ? "Acontecendo…" : s.cta}</button>
                    {err && <p role="alert" className="mt-2 text-sm font-medium text-[#c22a3a]">{err}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {done && (
          <div className="mt-4 rounded-2xl bg-breu p-5 text-white">
            <div className="poster text-[28px] uppercase">Noite completa</div>
            <p className="mt-1 text-sm text-white/70">Ingresso, portaria, cardápio, bar, pagamento e IA funcionando juntos. Explore os celulares à vontade.</p>
          </div>
        )}
        <button className="btn-line mt-4 w-full" onClick={restart}>Recomeçar simulação</button>

        {log.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">O que aconteceu</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {log.map((l, i) => (
                <li key={i} className="flex gap-3"><span className="shrink-0 tabular-nums text-nevoa">{l.at}</span><span><b className="font-medium">{LABEL[l.who].split(":")[0]}:</b> {l.text}</span></li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section ref={wrap} className="mt-8 lg:mt-0">
        {mobile && (
          <div className="mb-4 flex rounded-full bg-white p-1" role="tablist">
            {(["cliente", "equipe", "dono"] as Frame[]).map((f) => (
              <button key={f} role="tab" aria-selected={focus === f} onClick={() => setFocus(f)} className={`flex-1 rounded-full py-2 text-sm font-medium ${focus === f ? "bg-breu text-white" : "text-nevoa"}`}>{f === "cliente" ? "Cliente" : f === "equipe" ? "Equipe" : "Dono"}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-6 lg:flex-nowrap lg:justify-start">
          {visible.map((f) => <Phone key={f} frame={f} src={frames[f]} k={keys[f]} scale={scale} highlight={!done && steps[step]?.who === f} />)}
        </div>
      </section>
    </div>
  );
}
