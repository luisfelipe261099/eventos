"use client";
import { useCallback, useEffect, useState } from "react";
import { Avatar, Pill, Stat } from "@/components/ui";
import { brl } from "@/lib/format";

type Guest = { id: string; name: string; status: "pending" | "on_the_way" | "inside" };
type View = { event: { name: string; slug: string }; promoter: { id: string; name: string } | null; guests: Guest[]; inside: number; total: number; commissionCents: number };

export default function PromoterApp({ demoChoices, linkCode, invalidLink }: { demoChoices: { code: string; name: string }[]; linkCode: string | null; invalidLink: boolean }) {
  const promoters = demoChoices.map((c) => ({ id: c.code, name: c.name }));
  const [pid, setPid] = useState<string>("");
  const [view, setView] = useState<View | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });

  // o código do link fica salvo no celular do promoter
  useEffect(() => {
    if (linkCode) { localStorage.setItem("vf_promoter", linkCode); setPid(linkCode); return; }
    const saved = localStorage.getItem("vf_promoter");
    setPid(saved ?? demoChoices[0]?.code ?? "");
  }, [linkCode, demoChoices]);
  const load = useCallback(async () => {
    if (!pid) return;
    const r = await fetch(`/api/promoter?k=${encodeURIComponent(pid)}`, { cache: "no-store" });
    if (r.ok) { setView(await r.json()); setMsg((m) => (m.startsWith("Link") ? "" : m)); }
    else { setView(null); setMsg((await r.json()).error ?? "Não foi possível carregar sua lista."); }
  }, [pid]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  function checkin(entryId: string) {
    setMsg(""); setBusy(entryId);
    if (!navigator.geolocation) { setBusy(null); return setMsg("Seu aparelho não tem GPS disponível."); }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await fetch("/api/promoter/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k: pid, entryId, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }) });
      const j = await r.json(); setBusy(null);
      setMsg(r.ok ? `✓ Presença confirmada (${j.distance} m da casa)` : j.error);
      load();
    }, () => { setBusy(null); setMsg("Permita o acesso à localização para validar."); }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async function addGuest() {
    const r = await fetch("/api/promoter/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k: pid, ...form }) });
    if (r.ok) { setForm({ name: "", phone: "" }); load(); } else setMsg((await r.json()).error);
  }

  const link = view?.promoter && typeof window !== "undefined" ? `${location.origin}/e/${view.event.slug}?ref=${view.promoter.id}` : "";
  const tone = { inside: "ok", on_the_way: "warn", pending: "mut" } as const;
  const label = { inside: "✓ Na casa", on_the_way: "A caminho", pending: "Pendente" };

  return (
    <div className="space-y-4">
      {invalidLink && <p className="rounded-xl bg-bad/15 p-3 text-sm text-bad">Este link de promoter não é válido ou foi desativado. Peça um novo para a casa.</p>}
      {promoters.length > 0 ? (
        <select className="input" aria-label="Promoter (demonstração)" value={pid} onChange={(e) => { setPid(e.target.value); localStorage.setItem("vf_promoter", e.target.value); }}>
          {promoters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ) : !pid ? (
        <div className="card text-sm text-mut">Abra o link de acesso que a casa enviou para você pelo WhatsApp.</div>
      ) : view?.promoter && <div className="text-sm">Olá, <b>{view.promoter.name.split(" ")[0]}</b></div>}
      {view && (
        <>
          <div className="text-sm text-mut">{view.event.name}</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Presentes" value={<>{view.inside}<span className="text-sm text-mut">/{view.total}</span></>} />
            <Stat label="Comissão" value={brl(view.commissionCents)} tone="ok" />
          </div>
          <button className="btn-ghost w-full text-sm" onClick={() => { navigator.clipboard.writeText(link); setMsg("Link de venda copiado! Quem comprar por ele entra na sua lista."); }}>🔗 Copiar meu link de venda</button>
          {msg && <p className="rounded-xl bg-white/5 p-3 text-sm">{msg}</p>}
          <div className="space-y-2">
            {view.guests.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <Avatar name={g.name} />
                <div className="flex-1 font-medium">{g.name}</div>
                {g.status === "inside" ? <Pill tone="ok">{label.inside}</Pill> : (
                  <button className="pill bg-brand/20 px-3 py-1.5 text-brandl" disabled={busy === g.id} onClick={() => checkin(g.id)}>{busy === g.id ? "📍…" : "📍 Validar"}</button>
                )}
                {g.status !== "inside" && <Pill tone={tone[g.status]}>{label[g.status]}</Pill>}
              </div>
            ))}
          </div>
          <div className="card space-y-2">
            <div className="text-sm font-semibold">Adicionar convidado</div>
            <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="WhatsApp" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button className="btn w-full" disabled={!form.name || !form.phone} onClick={addGuest}>+ Adicionar</button>
          </div>
          <p className="text-center text-xs text-mut">A presença só é validada dentro da área do evento (GPS). A comissão é calculada automaticamente.</p>
        </>
      )}
    </div>
  );
}
