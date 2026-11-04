"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Lot = { id?: string; name: string; price_cents: number; quantity: number; sold: number };
type Init = { id?: string; slug?: string; name: string; starts_local: string; category: string; description: string; min_age: number; capacity: number; cover_url: string; lots: Lot[] };

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const toCents = (v: string) => Math.round(parseFloat(v.replace(/\./g, "").replace(",", ".")) * 100) || 0;

export default function EventForm({ initial, canUpload }: { initial: Init; canUpload: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [lots, setLots] = useState(initial.lots.map((l) => ({ ...l, price: reais(l.price_cents) })));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof Init, v: string | number) => setF({ ...f, [k]: v });

  async function upload(file: File) {
    setUploading(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json(); setUploading(false);
    if (r.ok) set("cover_url", j.url); else setMsg({ ok: false, t: j.error });
  }

  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, lots: lots.map((l) => ({ id: l.id, name: l.name, quantity: Number(l.quantity), price_cents: toCents(l.price) })) }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error ?? "Não foi possível salvar." });
    setMsg({ ok: true, t: "Evento salvo." });
    if (!f.id) router.replace(`/admin/eventos/${j.id}`); else router.refresh();
    setF({ ...f, id: j.id, slug: j.slug });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <label className="block"><span className="mb-1 block text-sm text-mut">Nome do evento</span><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Sexta Open Bar" /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm text-mut">Data e horário (Brasília)</span><input type="datetime-local" className="input" value={f.starts_local} onChange={(e) => set("starts_local", e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm text-mut">Categoria</span>
            <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>{["Festas", "Shows", "Barzinho"].map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <label className="block"><span className="mb-1 block text-sm text-mut">Descrição</span><textarea className="input min-h-24" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Atrações, o que está incluso, regras da casa…" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm text-mut">Idade mínima</span><input type="number" className="input" value={f.min_age} onChange={(e) => set("min_age", Number(e.target.value))} /></label>
          <label className="block"><span className="mb-1 block text-sm text-mut">Capacidade da casa</span><input type="number" className="input" value={f.capacity} onChange={(e) => set("capacity", Number(e.target.value))} /></label>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Lotes de ingresso</h3><button className="text-sm text-brandl" onClick={() => setLots([...lots, { name: "", price: "0,00", price_cents: 0, quantity: 100, sold: 0 }])}>+ Adicionar lote</button></div>
          <div className="space-y-2">
            {lots.map((l, i) => (
              <div key={l.id ?? i} className="grid grid-cols-[1fr_110px_90px] gap-2">
                <input className="input" aria-label="Nome do lote" placeholder="Pista · 1º lote" value={l.name} onChange={(e) => setLots(lots.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="input" aria-label="Preço (R$)" inputMode="decimal" value={l.price} onChange={(e) => setLots(lots.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                <input className="input" aria-label="Quantidade" type="number" value={l.quantity} onChange={(e) => setLots(lots.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
                {l.sold > 0 && <div className="col-span-3 -mt-1 text-xs text-mut">{l.sold} vendidos neste lote</div>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-mut">Nome · preço em R$ (0 para lista free) · quantidade. Para virar o lote, cadastre o próximo e reduza a quantidade do atual.</p>
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.t}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar evento"}</button>
          {f.slug && <a className="btn-ghost" href={`/e/${f.slug}`} target="_blank">Ver página de venda</a>}
          {f.slug && <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(`${location.origin}/e/${f.slug}`)}>Copiar link de venda</button>}
        </div>
      </div>

      <aside>
        <div className="mb-1 text-sm text-mut">Flyer (4:5, ex.: 1080×1350)</div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-black">
          {f.cover_url ? <img src={f.cover_url} alt="Flyer do evento" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-mut">Sem flyer ainda</div>}
        </div>
        {canUpload && <label className="btn-ghost mt-3 w-full cursor-pointer">{uploading ? "Enviando…" : "Enviar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>}
        <input className="input mt-2 text-sm" placeholder="ou cole a URL da imagem" value={f.cover_url} onChange={(e) => set("cover_url", e.target.value)} />
      </aside>
    </div>
  );
}
