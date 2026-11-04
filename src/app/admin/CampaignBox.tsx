"use client";
import { useState } from "react";

type C = { title: string; caption: string; hashtags: string; source: string };

export default function CampaignBox({ suggestions, ai }: { suggestions: string[]; ai: boolean }) {
  const [highlight, setHighlight] = useState(suggestions[0] ?? "");
  const [tone, setTone] = useState<"festa" | "premium" | "urgencia">("festa");
  const [c, setC] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);
  async function gen() {
    setBusy(true);
    const r = await fetch("/api/ai/campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ highlight, tone }) });
    setBusy(false); if (r.ok) setC(await r.json());
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">{suggestions.map((s) => <button key={s} onClick={() => setHighlight(s)} className={`pill px-3 py-1.5 ${highlight === s ? "bg-brand text-white" : "bg-white/5 text-mut"}`}>{s}</button>)}</div>
        <textarea className="input min-h-20" value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="O que você quer divulgar?" />
        <div className="flex gap-2">{(["festa", "premium", "urgencia"] as const).map((t) => <button key={t} onClick={() => setTone(t)} className={`pill flex-1 justify-center py-2 capitalize ${tone === t ? "bg-brand text-white" : "bg-white/5 text-mut"}`}>{t === "urgencia" ? "urgência" : t}</button>)}</div>
        <button className="btn w-full" disabled={busy || !highlight} onClick={gen}>{busy ? "Criando…" : "✦ Gerar campanha"}</button>
        {!ai && <p className="text-xs text-mut">Sem GEMINI_API_KEY: usando modelos de texto prontos. Adicione a chave grátis do Google AI Studio para textos criados pela IA.</p>}
      </div>
      {c && (
        <div className="overflow-hidden rounded-2xl border border-line bg-[#0c1730]">
          <div className="flex aspect-square items-end p-6" style={{ background: "radial-gradient(circle at 30% 30%,#c46bff,transparent 55%),radial-gradient(circle at 80% 75%,#3b5bff,transparent 50%),#1a0f3a" }}>
            <div className="h-display text-4xl leading-none">{c.title}</div>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>{c.caption}</p><p className="text-brandl">{c.hashtags}</p>
            <button className="btn-ghost w-full text-xs" onClick={() => navigator.clipboard.writeText(`${c.caption}\n\n${c.hashtags}`)}>Copiar legenda</button>
            <p className="text-[10px] text-mut">Gerado por: {c.source === "gemini" ? "Gemini" : "modelo pronto"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
