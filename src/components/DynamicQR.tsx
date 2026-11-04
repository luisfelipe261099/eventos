"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { makeQrPayload, QR_WINDOW_S, secondsLeft } from "@/lib/qr";

/** Gera o QR no próprio celular a cada 30 s (funciona offline: a semente fica salva no aparelho). */
export default function DynamicQR({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [img, setImg] = useState<string>("");
  const [left, setLeft] = useState(QR_WINDOW_S);

  useEffect(() => {
    localStorage.setItem(`vf_seed_${ticketId}`, seed);
    let last = "";
    const tick = async () => {
      setLeft(secondsLeft());
      const payload = await makeQrPayload(ticketId, seed);
      if (payload !== last) {
        last = payload;
        setImg(await QRCode.toDataURL(payload, { margin: 1, width: 560, errorCorrectionLevel: "M", color: { dark: "#0a142b", light: "#ffffff" } }));
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [ticketId, seed]);

  return (
    <div className="my-4">
      <div className="mx-auto aspect-square w-64 rounded-2xl bg-white p-3">
        {img && <img src={img} alt="QR code do ingresso" className="h-full w-full" />}
      </div>
      <div className="mt-3 text-sm text-mut">QR dinâmico · atualiza em <b className="text-brandl">0:{String(left).padStart(2, "0")}</b></div>
      <div className="mx-auto mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-brand to-brand2 transition-all duration-1000" style={{ width: `${(left / QR_WINDOW_S) * 100}%` }} />
      </div>
    </div>
  );
}
