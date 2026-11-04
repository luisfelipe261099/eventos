"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PromoButton({ productId, productName, promoCents, active }: { productId: string; productName: string; promoCents: number; active: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">(active ? "done" : "idle");
  async function apply() {
    setState("busy");
    const r = await fetch("/api/products/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, promoCents, hours: 4 }) });
    setState(r.ok ? "done" : "idle");
    router.refresh();
  }
  if (state === "done") return <span className="pill bg-ok/15 text-ok">✓ No cardápio</span>;
  return <button className="pill bg-brand px-3 py-1.5 text-white" disabled={state === "busy"} onClick={apply} title={`Ativar promoção de ${productName} por 4h`}>{state === "busy" ? "…" : "Ativar promoção"}</button>;
}
