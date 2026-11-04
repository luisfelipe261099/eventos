"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { makeQrPayload, QR_WINDOW_S, secondsLeft } from "@/lib/qr";

/** Gera o QR no próprio celular a cada 30 s (funciona offline: a semente fica salva no aparelho). */
export default function DynamicQR({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [img, setImg] = useState("");
  const [left, setLeft] = useState(QR_WINDOW_S);

  useEffect(() => {
    localStorage.setItem(`vf_seed_${ticketId}`, seed);
    let last = "";
    const tick = async () => {
      setLeft(secondsLeft());
      const payload = await makeQrPayload(ticketId, seed);
      if (payload !== last) {
        last = payload;
        setImg(await QRCode.toDataURL(payload, { margin: 0, width: 600, errorCorrectionLevel: "M", color: { dark: "#16141c", light: "#ffffff" } }));
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [ticketId, seed]);

  return (
    <div>
      <div className="mx-auto aspect-square w-60">{img && <img src={img} alt="QR code do ingresso" className="h-full w-full" />}</div>
      <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-linha" aria-hidden>
        <div className="h-full bg-violeta transition-[width] duration-1000 ease-linear" style={{ width: `${(left / QR_WINDOW_S) * 100}%` }} />
      </div>
      <p className="mt-2 text-center text-xs text-nevoa" aria-live="polite">Novo código em {left}s</p>
    </div>
  );
}
