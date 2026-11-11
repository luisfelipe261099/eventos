"use client";
import { useCallback, useEffect, useState } from "react";
import { brl, fmtTime, isValidCpf, maskCpf } from "@/lib/format";

type Line = { id: string; name: string; qty: number; unit_price_cents: number; status: string; created_at: string };
type TabData = { tab: { id: string; table_label: string; status: string }; lines: Line[]; subtotal: number; service: number; total: number; requireCpf?: boolean; payOnline?: boolean };

const STATUS: Record<string, { t: string; c: string }> = {
  queued: { t: "Na fila", c: "bg-linha text-nevoa" }, preparing: { t: "Preparando", c: "bg-[#fff1dc] text-[#9a5b00]" },
  ready: { t: "Pronto para retirar", c: "bg-violeta text-white" }, delivered: { t: "Entregue", c: "bg-[#e3f6ec] text-verde" }, cancelled: { t: "Cancelado", c: "bg-linha text-nevoa" },
};

export default function TabView({ id }: { id: string }) {
  const [data, setData] = useState<TabData | null>(null);
  const [err, setErr] = useState("");
  const [people, setPeople] = useState(1);
  const [paying, setPaying] = useState(false);
  const [pix, setPix] = useState<{ qrCode?: string; qrCodeBase64?: string } | null>(null);
  const [cpf, setCpf] = useState("");
  const [askCpf, setAskCpf] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setCpf(JSON.parse(localStorage.getItem("vf_profile") ?? "{}").cpf ?? ""); } catch {} }, []);

  const load = useCallback(async () => {
    const r = await fetch(`/api/tabs/${id}`, { cache: "no-store" });
    if (!r.ok) return setErr("Comanda não encontrada. Ela pode ter sido fechada.");
    setData(await r.json());
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  async function pay() {
    setPaying(true); setPayErr("");
    const r = await fetch(`/api/tabs/${id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(askCpf ? { cpf } : {}) });
    const j = await r.json();
    setPaying(false);
    if (r.status === 422) { setAskCpf(true); return; }
    if (!r.ok) return setPayErr(j.error ?? "Não foi possível gerar o Pix.");
    if (askCpf) { const p = JSON.parse(localStorage.getItem("vf_profile") ?? "{}"); localStorage.setItem("vf_profile", JSON.stringify({ ...p, cpf })); }
    if (j.pix?.status === "approved") { localStorage.removeItem("vf_tab"); load(); } else setPix(j.pix);
  }

  if (err) return <p className="text-nevoa">{err}</p>;
  if (!data) return <p className="text-nevoa">Carregando…</p>;
  const paid = data.tab.status === "paid";
  return (
    <div className="pb-10">
      <p className="text-sm text-nevoa">{data.tab.table_label} · comanda {data.tab.id.slice(-4).toUpperCase()}</p>
      <h1 className="h-display text-[34px]">Minha comanda</h1>

      <div className="stub mt-6 overflow-hidden">
        <ul className="divide-y divide-linha px-5">
          {data.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-3.5">
              <div className="flex-1"><div className="font-semibold">{l.qty}× {l.name}</div><div className="text-sm text-nevoa">{fmtTime(l.created_at)} · {brl(l.qty * l.unit_price_cents)}</div></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[l.status]?.c}`}>{STATUS[l.status]?.t ?? l.status}</span>
            </li>
          ))}
        </ul>
        <div className="stub-cut" aria-hidden><i /></div>
        <div className="space-y-1.5 px-5 pb-5 text-[15px]">
          <div className="flex justify-between text-nevoa"><span>Consumo</span><span>{brl(data.subtotal)}</span></div>
          <div className="flex justify-between text-nevoa"><span>Serviço (10%)</span><span>{brl(data.service)}</span></div>
          <div className="flex items-baseline justify-between pt-2"><span className="font-semibold">Total</span><span className="poster text-[34px]">{brl(data.total)}</span></div>
          {people > 1 && <div className="flex justify-between font-medium text-violeta"><span>Para cada um ({people})</span><span>{brl(Math.ceil(data.total / people))}</span></div>}
        </div>
      </div>

      {paid ? (
        <p className="mt-6 rounded-2xl bg-[#e3f6ec] p-4 text-center font-semibold text-verde">Comanda paga. Boa festa!</p>
      ) : pix ? (
        <div className="sheet mt-6 p-6 text-center">
          {pix.qrCodeBase64 && <img alt="QR code do Pix" className="mx-auto w-52" src={`data:image/png;base64,${pix.qrCodeBase64}`} />}
          {pix.qrCode && <button className="btn-line mt-3 w-full" onClick={() => { navigator.clipboard.writeText(pix.qrCode!); setCopied(true); }}>{copied ? "Código copiado" : "Copiar código Pix"}</button>}
          <p className="mt-3 text-sm text-nevoa">Assim que o Pix cair, a comanda fecha sozinha.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between rounded-full border border-linha bg-white py-1.5 pl-5 pr-1.5">
            <span className="text-[15px]">Dividir a conta</span>
            <div className="flex items-center gap-1">
              <button className="h-9 w-9 rounded-full bg-papel text-lg" aria-label="Menos pessoas" onClick={() => setPeople(Math.max(1, people - 1))}>–</button>
              <span className="w-8 text-center font-semibold">{people}</span>
              <button className="h-9 w-9 rounded-full bg-papel text-lg" aria-label="Mais pessoas" onClick={() => setPeople(people + 1)}>+</button>
            </div>
          </div>
          {askCpf && (
            <label className="block"><span className="mb-1.5 block text-sm font-medium">CPF para o Pix</span>
              <input className="field" inputMode="numeric" placeholder="000.000.000-00" value={maskCpf(cpf)} onChange={(e) => setCpf(e.target.value)} />
            </label>
          )}
          {payErr && <p role="alert" className="text-sm font-medium text-[#c22a3a]">{payErr}</p>}
          {data.payOnline === false
            ? <p className="rounded-xl bg-papel p-3 text-center text-sm text-nevoa">Pagamento no caixa: chame o atendente para fechar a conta.</p>
            : <button className="btn-primary w-full" onClick={pay} disabled={paying || data.total === 0 || (askCpf && !isValidCpf(cpf))}>{paying ? "Gerando Pix…" : `Pagar ${brl(data.total)} com Pix`}</button>}
          <button onClick={() => history.back()} className="btn-line w-full">Pedir mais</button>
        </div>
      )}
    </div>
  );
}
