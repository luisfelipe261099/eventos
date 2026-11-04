"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/types";
import { brl, isValidCpf, maskCpf } from "@/lib/format";

type Pix = { status: string; qrCode?: string; qrCodeBase64?: string; expiresAt?: string };

export default function BuyForm({ eventId, types, referral, requireCpf }: { eventId: string; types: TicketType[]; referral: string | null; requireCpf: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState(types.find((t) => t.sold < t.quantity)?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<{ ticketId: string; pix: Pix } | null>(null);
  const chosen = types.find((t) => t.id === sel);
  const needCpf = requireCpf && (chosen?.price_cents ?? 0) > 0;
  const cpfOk = !needCpf || isValidCpf(cpf);

  useEffect(() => {
    const saved = localStorage.getItem("vf_profile");
    if (saved) { const p = JSON.parse(saved); setName(p.name ?? ""); setPhone(p.phone ?? ""); setCpf(p.cpf ?? ""); }
  }, []);

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
    localStorage.setItem("vf_profile", JSON.stringify({ name, phone, cpf }));
    const r = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, ticketTypeId: sel, name, phone, ref: referral, ...(needCpf ? { cpf } : {}) }) });
    const j = await r.json(); setLoading(false);
    if (!r.ok) return setErr(j.error ?? "Não foi possível concluir a compra. Tente de novo.");
    const mine: string[] = JSON.parse(localStorage.getItem("vf_tickets") ?? "[]");
    localStorage.setItem("vf_tickets", JSON.stringify([j.ticketId, ...mine.filter((x) => x !== j.ticketId)]));
    if (j.pix.status === "approved") router.push(`/ingresso/${j.ticketId}`);
    else setPending({ ticketId: j.ticketId, pix: j.pix });
  }

  if (pending) return (
    <div className="sheet mt-4 p-6 text-center">
      <h3 className="h-display text-2xl">Pague com Pix</h3>
      <p className="mt-1 text-sm text-nevoa">Abra o app do seu banco e escaneie o código.</p>
      {pending.pix.qrCodeBase64 && <img alt="QR code do Pix" className="mx-auto mt-4 w-56" src={`data:image/png;base64,${pending.pix.qrCodeBase64}`} />}
      {pending.pix.qrCode && <button className="btn-line mt-4 w-full" onClick={() => { navigator.clipboard.writeText(pending.pix.qrCode!); setCopied(true); }}>{copied ? "Código copiado" : "Copiar código Pix"}</button>}
      <p className="mt-4 text-sm text-nevoa">Seu ingresso abre sozinho assim que o pagamento for confirmado. Pode deixar esta tela aberta.</p>
      {pending.pix.expiresAt && <p className="mt-1 text-xs text-nevoa">Código válido até {new Date(pending.pix.expiresAt.replace(" ", "T") + "-03:00").toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p>}
    </div>
  );

  return (
    <div className="mt-4">
      <div role="radiogroup" aria-label="Tipo de ingresso" className="space-y-3">
        {types.map((t) => {
          const soldOut = t.sold >= t.quantity;
          const left = t.quantity - t.sold;
          const active = sel === t.id;
          return (
            <button key={t.id} role="radio" aria-checked={active} disabled={soldOut} onClick={() => setSel(t.id)}
              className={`stub flex w-full items-stretch overflow-hidden text-left ring-2 transition-shadow ${active ? "ring-violeta" : "ring-transparent"} ${soldOut ? "opacity-45" : ""}`}>
              <div className="flex-1 p-4">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-0.5 text-sm text-nevoa">{soldOut ? "Esgotado" : left <= 50 ? `Restam ${left}` : "Disponível"}</div>
              </div>
              <div className="relative flex w-28 items-center justify-center border-l-2 border-dashed border-linha">
                <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-papel" /><span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-papel" />
                <span className="poster text-[24px]">{t.price_cents === 0 ? "Grátis" : brl(t.price_cents)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Nome completo</span><input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">WhatsApp</span><input className="field" inputMode="tel" autoComplete="tel" placeholder="(41) 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        {needCpf && (
          <label className="block"><span className="mb-1.5 block text-sm font-medium">CPF</span>
            <input className="field" inputMode="numeric" placeholder="000.000.000-00" value={maskCpf(cpf)} onChange={(e) => setCpf(e.target.value)} aria-invalid={cpf.length >= 11 && !cpfOk} />
            {cpf.replace(/\D/g, "").length === 11 && !cpfOk && <span className="mt-1 block text-sm text-[#c22a3a]">CPF inválido. Confira os números.</span>}
          </label>
        )}
        <p className="text-xs text-nevoa">O ingresso fica no seu celular e também enviamos o link pelo WhatsApp.</p>
        {err && <p role="alert" className="text-sm font-medium text-[#c22a3a]">{err}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-4 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex-1"><div className="text-xs text-nevoa">{chosen?.name ?? "Escolha um ingresso"}</div><div className="poster text-[26px]">{chosen ? brl(chosen.price_cents) : "—"}</div></div>
          <button className="btn-primary" disabled={!chosen || loading || !name.trim() || !phone.trim() || !cpfOk} onClick={buy}>{loading ? "Processando…" : "Comprar com Pix"}</button>
        </div>
      </div>
    </div>
  );
}
