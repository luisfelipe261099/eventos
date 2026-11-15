"use client";
import { useState } from "react";

/** Botão que copia um texto (link, URL, token). */
export default function CopyField({ value, label }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-ghost max-w-full truncate py-2 text-xs" title={value}
      onClick={async () => { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? "Copiado ✓" : label ?? value}
    </button>
  );
}
