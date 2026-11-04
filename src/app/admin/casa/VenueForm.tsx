"use client";
import { useState } from "react";
import QRCode from "qrcode";

type V = { name: string; city: string; address: string; lat: number; lng: number; geofence_m: number; slug?: string };

export default function VenueForm({ initial }: { initial: V | null }) {
  const [v, setV] = useState<V>(initial ?? { name: "", city: "Curitiba", address: "", lat: 0, lng: 0, geofence_m: 80 });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tables, setTables] = useState(20);
  const [qrs, setQrs] = useState<{ label: string; img: string }[]>([]);

  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/venue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error });
    setV({ ...v, slug: j.slug }); setMsg({ ok: true, t: "Dados da casa salvos." });
  }
  function locate() {
    setMsg(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => { setV({ ...v, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); setMsg({ ok: true, t: `Localização capturada (precisão de ${Math.round(p.coords.accuracy)} m). Clique em Salvar.` }); },
      () => setMsg({ ok: false, t: "Permita o acesso à localização. Faça isso de pé na porta da casa." }), { enableHighAccuracy: true, timeout: 15000 });
  }
  async function gen() {
    if (!v.slug) return setMsg({ ok: false, t: "Salve a casa primeiro." });
    const out = [];
    for (let i = 1; i <= Math.min(tables, 200); i++) {
      out.push({ label: `Mesa ${i}`, img: await QRCode.toDataURL(`${location.origin}/cardapio/${v.slug}?mesa=${i}`, { margin: 1, width: 360 }) });
    }
    out.push({ label: "Pista / balcão", img: await QRCode.toDataURL(`${location.origin}/cardapio/${v.slug}`, { margin: 1, width: 360 }) });
    setQrs(out);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4 print:hidden">
        <label className="block"><span className="mb-1 block text-sm text-mut">Nome da casa</span><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm text-mut">Cidade</span><input className="input" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-sm text-mut">Endereço</span><input className="input" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></label>
        </div>
        <div className="card space-y-3">
          <div className="font-semibold">Área de validação dos promoters</div>
          <p className="text-sm text-mut">O promoter só consegue confirmar a presença de um convidado se estiver dentro deste raio. Capture a localização em pé, na porta da casa.</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" aria-label="Latitude" value={v.lat} onChange={(e) => setV({ ...v, lat: Number(e.target.value) })} />
            <input className="input" aria-label="Longitude" value={v.lng} onChange={(e) => setV({ ...v, lng: Number(e.target.value) })} />
            <input className="input" aria-label="Raio em metros" type="number" value={v.geofence_m} onChange={(e) => setV({ ...v, geofence_m: Number(e.target.value) })} />
          </div>
          <div className="text-xs text-mut">Latitude · longitude · raio (m)</div>
          <button className="btn-ghost w-full" onClick={locate}>📍 Usar minha localização atual</button>
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.t}</p>}
        <button className="btn w-full" disabled={busy || !v.name} onClick={save}>{busy ? "Salvando…" : "Salvar"}</button>
      </div>

      <div>
        <div className="card space-y-3 print:hidden">
          <div className="font-semibold">QR codes das mesas</div>
          <p className="text-sm text-mut">Imprima e cole nas mesas. Ao escanear, o cliente abre o cardápio já com o número da mesa, e o pedido chega no bar identificado.</p>
          <div className="flex gap-2"><input className="input w-28" type="number" min={1} max={200} value={tables} onChange={(e) => setTables(Number(e.target.value))} aria-label="Quantidade de mesas" /><button className="btn flex-1" onClick={gen}>Gerar QR codes</button>{qrs.length > 0 && <button className="btn-ghost" onClick={() => print()}>Imprimir</button>}</div>
        </div>
        {qrs.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-black print:mt-0 print:grid-cols-4 print:rounded-none">
            {qrs.map((q) => <div key={q.label} className="break-inside-avoid text-center"><img src={q.img} alt={`QR ${q.label}`} className="mx-auto w-full max-w-[160px]" /><div className="mt-1 text-sm font-bold">{q.label}</div><div className="text-[10px]">Peça pelo celular · {v.name}</div></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
