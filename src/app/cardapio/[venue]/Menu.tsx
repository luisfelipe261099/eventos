"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { brl } from "@/lib/format";

const CAT_ORDER = ["Drinks", "Cervejas", "Combos", "Petiscos", "Garrafas"];
const THUMB: Record<string, string> = {
  Drinks: "radial-gradient(circle at 40% 35%,#9be7ff,#2a7fa8)", Cervejas: "radial-gradient(circle at 40% 35%,#ffd36b,#c27a12)",
  Combos: "radial-gradient(circle at 40% 35%,#c6a6ff,#5a2fb0)", Petiscos: "radial-gradient(circle at 40% 35%,#ffb07a,#a8501f)", Garrafas: "radial-gradient(circle at 40% 35%,#fff2b0,#8a6a12)",
};

export default function Menu({ products, table }: { products: Product[]; table: string }) {
  const router = useRouter();
  const cats = useMemo(() => CAT_ORDER.filter((c) => products.some((p) => p.category === c)), [products]);
  const [cat, setCat] = useState(cats[0]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [tabId, setTabId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [askProfile, setAskProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setTabId(localStorage.getItem("vf_tab"));
    const p = localStorage.getItem("vf_profile"); if (p) setProfile(JSON.parse(p));
  }, []);

  const price = (p: Product) => p.promo_price_cents ?? p.price_cents;
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  const total = Object.entries(cart).reduce((s, [id, n]) => s + n * price(products.find((p) => p.id === id)!), 0);
  const add = (id: string, d: number) => setCart((c) => { const n = Math.max(0, (c[id] ?? 0) + d); const x = { ...c, [id]: n }; if (!n) delete x[id]; return x; });

  async function send() {
    if (!tabId && (!profile.name || !profile.phone)) return setAskProfile(true);
    setSending(true); setErr("");
    localStorage.setItem("vf_profile", JSON.stringify(profile));
    const r = await fetch("/api/tabs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tabId, table, ...profile, items: Object.entries(cart).map(([productId, qty]) => ({ productId, qty })) }) });
    const j = await r.json(); setSending(false);
    if (!r.ok) return setErr(j.error ?? "Não foi possível enviar");
    localStorage.setItem("vf_tab", j.tabId);
    router.push(`/comanda/${j.tabId}`);
  }

  return (
    <div>
      {tabId && <Link href={`/comanda/${tabId}`} className="btn-ghost mb-3 w-full text-sm">🧾 Ver minha comanda</Link>}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`pill px-4 py-2 text-sm ${cat === c ? "bg-brand text-white" : "bg-white/5 text-mut"}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-2">
        {products.filter((p) => p.category === cat).map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="h-14 w-14 shrink-0 rounded-xl" style={{ background: THUMB[p.category] }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm">
                {p.promo_price_cents ? (<><s className="text-mut">{brl(p.price_cents)}</s> <b className="text-ok">{brl(p.promo_price_cents)}</b> <span className="pill bg-ok/15 text-ok">Promo</span></>) : <b>{brl(p.price_cents)}</b>}
              </div>
            </div>
            {cart[p.id] ? (
              <div className="flex items-center gap-2 font-bold">
                <button className="h-8 w-8 rounded-lg bg-white/10" onClick={() => add(p.id, -1)}>–</button>{cart[p.id]}
                <button className="h-8 w-8 rounded-lg bg-white/10" onClick={() => add(p.id, 1)}>+</button>
              </div>
            ) : (
              <button className="h-9 w-9 rounded-xl bg-brand text-xl font-bold" onClick={() => add(p.id, 1)} aria-label={`Adicionar ${p.name}`}>+</button>
            )}
          </div>
        ))}
      </div>

      {askProfile && !tabId && (
        <div className="card mt-4 space-y-2">
          <div className="text-sm text-mut">Para abrir sua comanda:</div>
          <input className="input" placeholder="Seu nome" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <input className="input" placeholder="WhatsApp" inputMode="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
      )}
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-md px-4">
          <button className="btn w-full justify-between" disabled={sending} onClick={send}>
            <span>{count} {count === 1 ? "item" : "itens"}</span><span>{sending ? "Enviando…" : `Pedir · ${brl(total)}`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
