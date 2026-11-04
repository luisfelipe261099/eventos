"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/types";
import { brl } from "@/lib/format";

type Pix = { status: string; qrCode?: string; qrCodeBase64?: string };

export default function BuyForm({ eventId, types, referral }: { eventId: string; types: TicketType[]; referral: string | null }) {
  const router = useRouter();
  const [sel, setSel] = useState(types.find((t) => t.sold < t.quantity)?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState<{ ticketId: string; pix: Pix } | null>(null);
  const chosen = types.find((t) => t.id === sel);

  useEffect(() => {
    const saved = localStorage.getItem("vf_profile");
    if (saved) { const p = JSON.parse(saved); setName(p.name ?? ""); setPhone(p.phone ?? ""); }
  }, []);

  // aguardando pagamento Pix → consulta o status a cada 4 s
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/tickets/${pending.ticketId}`).then((r) => r.json());
      if (r.status === "paid") router.push(`/ingresso/${pending.ticketId}`);
    }, 4000);
    return () => clearInterval(t);
  }, [pending, router]);

  async function buy() {
    setErr(""); setLoading(true);
    localStorage.setItem("vf_profile", JSON.stringify({ name, phone }));
    const r = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, ticketTypeId: sel, name, phone, ref: referral }) });
    const j = await r.json(); setLoading(false);
    if (!r.ok) return setErr(j.error ?? "Erro ao comprar");
    const mine = JSON.parse(localStorage.getItem("vf_tickets") ?? "[]"); localStorage.setItem("vf_tickets", JSON.stringify([j.ticketId, ...mine]));
    if (j.pix.status === "approved") router.push(`/ingresso/${j.ticketId}`);
    else setPending({ ticketId: j.ticketId, pix: j.pix });
  }

  if (pending) return (
    <div className="card mt-4 text-center">
      <div className="kick">Pague com Pix</div>
      {pending.pix.qrCodeBase64 && <img alt="QR Pix" className="mx-auto mt-3 w-56 rounded-xl bg-white p-2" src={`data:image/png;base64,${pending.pix.qrCodeBase64}`} />}
      {pending.pix.qrCode && <button className="btn-ghost mt-3 w-full text-xs" onClick={() => navigator.clipboard.writeText(pending.pix.qrCode!)}>Copiar código Pix</button>}
      <p className="mt-3 text-sm text-mut">Assim que o pagamento cair, seu ingresso abre sozinho.</p>
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="text-sm text-mut">Escolha o ingresso</div>
      {types.map((t) => {
        const soldOut = t.sold >= t.quantity;
        return (
          <button key={t.id} disabled={soldOut} onClick={() => setSel(t.id)}
            className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${sel === t.id ? "border-brand bg-brand/10" : "border-line bg-white/5"} ${soldOut ? "opacity-40" : ""}`}>
            <div><div className="font-semibold">{t.name}</div><div className="text-xs text-mut">{soldOut ? "Esgotado" : t.quantity - t.sold < 50 ? "Restam poucos" : "Disponível"}</div></div>
            <div className="font-bold">{brl(t.price_cents)}</div>
          </button>
        );
      })}
      <input className="input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="WhatsApp (com DDD)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {err && <p className="text-sm text-bad">{err}</p>}
      <button className="btn w-full" disabled={!chosen || loading || !name || !phone} onClick={buy}>
        {loading ? "Processando…" : `Pagar com Pix · ${chosen ? brl(chosen.price_cents) : ""}`}
      </button>
      {referral && <p className="text-center text-xs text-mut">Indicado por promoter</p>}
    </div>
  );
}
