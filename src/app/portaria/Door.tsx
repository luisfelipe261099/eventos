"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifyQrPayload } from "@/lib/qr";

type Manifest = { eventId: string; downloadedAt: string; tickets: { id: string; seed: string; holder: string; used: boolean }[] };
type Pending = { ticketId: string; at: string; gate: string; offline: boolean };
type Result = { ok: boolean; title: string; sub: string; ms: number };

const K_MAN = "vf_door_manifest", K_USED = "vf_door_used", K_QUEUE = "vf_door_queue";
const GATE = "Entrada 1";
const REASONS: Record<string, string> = { formato: "QR inválido", desconhecido: "Ingresso não encontrado", expirado: "QR expirado (print?)", assinatura: "QR falsificado" };

export default function Door() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(0);
  const used = useRef<Set<string>>(new Set());
  const seeds = useRef<Map<string, string>>(new Map());
  const holders = useRef<Map<string, string>>(new Map());
  const scanner = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastCode = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  const hydrate = (m: Manifest) => {
    seeds.current = new Map(m.tickets.map((t) => [t.id, t.seed]));
    holders.current = new Map(m.tickets.map((t) => [t.id, t.holder]));
    const savedUsed: string[] = JSON.parse(localStorage.getItem(K_USED) ?? "[]");
    used.current = new Set([...m.tickets.filter((t) => t.used).map((t) => t.id), ...savedUsed]);
    setCount(used.current.size);
  };

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("code");
    if (code) { download().then(() => validate(code)); }
    const m = localStorage.getItem(K_MAN); if (m) { const mm = JSON.parse(m); setManifest(mm); hydrate(mm); }
    setQueue(JSON.parse(localStorage.getItem(K_QUEUE) ?? "[]"));
    const up = () => setOnline(navigator.onLine); up();
    addEventListener("online", up); addEventListener("offline", up);
    return () => { removeEventListener("online", up); removeEventListener("offline", up); };
  }, []);

  async function download() {
    const r = await fetch("/api/door/manifest", { cache: "no-store" });
    if (!r.ok) return setResult({ ok: false, title: "Falha ao baixar lista", sub: (await r.json()).error ?? "", ms: 0 });
    const m: Manifest = await r.json();
    localStorage.setItem(K_MAN, JSON.stringify(m)); setManifest(m); hydrate(m);
    // mantém a fila local de quem já entrou por este aparelho
    const local: string[] = JSON.parse(localStorage.getItem(K_USED) ?? "[]");
    local.forEach((id) => used.current.add(id));
  }

  async function flush() {
    const q: Pending[] = JSON.parse(localStorage.getItem(K_QUEUE) ?? "[]");
    const m: Manifest | null = JSON.parse(localStorage.getItem(K_MAN) ?? "null");
    if (!q.length || !m) return;
    const r = await fetch("/api/door/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: m.eventId, items: q }) });
    if (r.ok) { localStorage.setItem(K_QUEUE, "[]"); setQueue([]); }
  }

  const sync = useCallback(async () => {
    const q: Pending[] = JSON.parse(localStorage.getItem(K_QUEUE) ?? "[]");
    if (!q.length || !manifest || !navigator.onLine) return;
    const r = await fetch("/api/door/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: manifest.eventId, items: q }) });
    if (r.ok) { localStorage.setItem(K_QUEUE, "[]"); setQueue([]); }
  }, [manifest]);
  useEffect(() => { const t = setInterval(sync, 10000); if (online) sync(); return () => clearInterval(t); }, [online, sync]);

  async function validate(code: string) {
    const now = Date.now();
    if (code === lastCode.current.code && now - lastCode.current.t < 3000) return; // ignora leitura repetida
    lastCode.current = { code, t: now };
    const t0 = performance.now();
    const check = await verifyQrPayload(code, seeds.current);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    if (!check.ok) { setResult({ ok: false, title: REASONS[check.reason], sub: check.ticketId ? holders.current.get(check.ticketId) ?? "" : "", ms }); navigator.vibrate?.([80, 60, 80]); return; }
    if (used.current.has(check.ticketId)) { setResult({ ok: false, title: "Já entrou!", sub: holders.current.get(check.ticketId) ?? "", ms }); navigator.vibrate?.([80, 60, 80]); return; }
    used.current.add(check.ticketId); setCount(used.current.size);
    localStorage.setItem(K_USED, JSON.stringify([...used.current]));
    const item: Pending = { ticketId: check.ticketId, at: new Date().toISOString(), gate: GATE, offline: !navigator.onLine };
    const q = [...JSON.parse(localStorage.getItem(K_QUEUE) ?? "[]"), item];
    localStorage.setItem(K_QUEUE, JSON.stringify(q)); setQueue(q);
    setResult({ ok: true, title: "Acesso liberado", sub: holders.current.get(check.ticketId) ?? "", ms });
    navigator.vibrate?.(120);
    if (navigator.onLine) flush();
  }

  async function toggleScan() {
    if (scanning) { await scanner.current?.stop().catch(() => {}); scanner.current?.clear(); setScanning(false); return; }
    const { Html5Qrcode } = await import("html5-qrcode");
    const s = new Html5Qrcode("reader");
    scanner.current = s as unknown as { stop: () => Promise<void>; clear: () => void };
    setScanning(true);
    await s.start({ facingMode: "environment" }, { fps: 12, qrbox: 240 }, (text) => validate(text), () => {}).catch((e: unknown) => {
      setScanning(false); setResult({ ok: false, title: "Câmera indisponível", sub: String(e), ms: 0 });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className={online ? "text-ok" : "text-warn"}>● {online ? "Online" : "Offline · modo local"}</span>
        <span className="text-mut">{count} entradas · {queue.length} p/ sincronizar</span>
      </div>

      {!manifest ? (
        <div className="card text-center">
          <p className="text-sm text-mut">Antes do evento, baixe a lista de ingressos neste aparelho. Depois disso a portaria funciona mesmo sem internet.</p>
          <button className="btn mt-3 w-full" onClick={download}>⬇️ Baixar lista do evento</button>
        </div>
      ) : (
        <>
          <div className="text-xs text-mut">Lista com {manifest.tickets.length} ingressos · baixada {new Date(manifest.downloadedAt).toLocaleTimeString("pt-BR")} <button className="text-brandl underline" onClick={download}>atualizar</button></div>
          <div id="reader" className={`overflow-hidden rounded-2xl ${scanning ? "border border-line" : ""}`} />
          <button className="btn w-full py-4 text-lg" onClick={toggleScan}>{scanning ? "⏹ Parar câmera" : "📷 Ler QR code"}</button>
          {result && (
            <div className={`card text-center ${result.ok ? "border-ok/50" : "border-bad/50"}`}>
              <div className={`h-display text-3xl ${result.ok ? "text-ok" : "text-bad"}`}>{result.ok ? "✓" : "✕"} {result.title}</div>
              {result.sub && <div className="mt-1 text-lg">{result.sub}</div>}
              {result.ms > 0 && <div className="mt-1 text-xs text-mut">validado localmente em {result.ms} ms</div>}
            </div>
          )}
          <details className="text-sm text-mut">
            <summary>Digitar código manualmente</summary>
            <div className="mt-2 flex gap-2"><input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="VF1.…" /><button className="btn-ghost" onClick={() => validate(manual)}>OK</button></div>
          </details>
        </>
      )}
    </div>
  );
}
