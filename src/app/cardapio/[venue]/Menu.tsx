"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { brl } from "@/lib/format";

const CAT_ORDER = ["Drinks", "Cervejas", "Combos", "Petiscos", "Garrafas"];

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
    const p = localStorage.getItem("vf_profile"); if (p) setProfile({ name: "", phone: "", ...JSON.parse(p) });
  }, []);

  const price = (p: Product) => p.promo_price_cents ?? p.price_cents;
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  const total = Object.entries(cart).reduce((s, [id, n]) => s + n * price(products.find((p) => p.id === id)!), 0);
  const add = (id: string, d: number) => setCart((c) => { const n = Math.max(0, (c[id] ?? 0) + d); const x = { ...c, [id]: n }; if (!n) delete x[id]; return x; });
  const promos = products.filter((p) => p.promo_price_cents);

  async function send() {
    if (!tabId && (!profile.name || !profile.phone)) return setAskProfile(true);
    setSending(true); setErr("");
    localStorage.setItem("vf_profile", JSON.stringify(profile));
    const r = await fetch("/api/tabs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tabId, table, ...profile, items: Object.entries(cart).map(([productId, qty]) => ({ productId, qty })) }) });
    const j = await r.json(); setSending(false);
    if (!r.ok) return setErr(j.error ?? "O pedido não foi enviado. Tente de novo.");
    localStorage.setItem("vf_tab", j.tabId);
    router.push(`/comanda/${j.tabId}`);
  }

  const Row = ({ p }: { p: Product }) => (
    <li className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{p.name}</div>
        <div className="mt-0.5 text-[15px]">
          {p.promo_price_cents ? (<><s className="text-nevoa">{brl(p.price_cents)}</s> <b className="text-verde">{brl(p.promo_price_cents)}</b></>) : <span className="text-tinta/80">{brl(p.price_cents)}</span>}
        </div>
      </div>
      {cart[p.id] ? (
        <div className="flex items-center gap-1 rounded-full bg-breu p-1 text-white">
          <button className="h-8 w-8 rounded-full text-lg hover:bg-white/15" aria-label={`Tirar ${p.name}`} onClick={() => add(p.id, -1)}>–</button>
          <span className="w-5 text-center font-semibold" aria-live="polite">{cart[p.id]}</span>
          <button className="h-8 w-8 rounded-full text-lg hover:bg-white/15" aria-label={`Mais ${p.name}`} onClick={() => add(p.id, 1)}>+</button>
        </div>
      ) : (
        <button className="h-10 rounded-full border border-linha bg-white px-4 text-sm font-semibold text-tinta hover:border-tinta" onClick={() => add(p.id, 1)} aria-label={`Adicionar ${p.name}`}>Adicionar</button>
      )}
    </li>
  );

  return (
    <div className="pb-28">
      {tabId && <Link href={`/comanda/${tabId}`} className="btn-line mt-4 w-full">Ver minha comanda</Link>}

      {promos.length > 0 && (
        <div className="mt-5 rounded-[22px] bg-breu p-5 text-white">
          <div className="poster text-[26px] uppercase">Promoção até 0h</div>
          <ul className="mt-1 divide-y divide-white/10 [&_.text-tinta\/80]:text-white/70 [&_.text-nevoa]:text-white/50">{promos.map((p) => <Row key={p.id} p={p} />)}</ul>
        </div>
      )}

      <div className="no-scrollbar sticky top-16 z-10 -mx-4 mt-5 flex gap-6 overflow-x-auto border-b border-linha bg-papel/95 px-4 backdrop-blur">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`relative whitespace-nowrap py-3.5 text-[16px] ${cat === c ? "font-semibold text-violeta" : "text-tinta/75"}`}>
            {c}{cat === c && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-violeta" />}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-linha">{products.filter((p) => p.category === cat).map((p) => <Row key={p.id} p={p} />)}</ul>

      {askProfile && !tabId && (
        <div className="sheet mt-4 space-y-3 p-5">
          <div className="font-semibold">Para abrir sua comanda</div>
          <input className="field" placeholder="Seu nome" autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <input className="field" placeholder="WhatsApp" inputMode="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
      )}
      {err && <p role="alert" className="mt-3 text-sm font-medium text-[#c22a3a]">{err}</p>}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-breu text-white">
          <div className="mx-auto flex max-w-md items-center gap-4 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="flex-1"><div className="text-xs text-white/60">{count} {count === 1 ? "item" : "itens"}</div><div className="poster text-[26px]">{brl(total)}</div></div>
            <button className="btn-primary" disabled={sending} onClick={send}>{sending ? "Enviando…" : "Fazer pedido"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
