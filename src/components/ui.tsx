import Link from "next/link";
import Image from "next/image";

export function Logo({ h = 28 }: { h?: number }) {
  return <Image src="/logo.png" alt="VipFlow" width={Math.round(h * 3.7)} height={h} priority />;
}

export function TopBar({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur">
      {back && <Link href={back} className="text-2xl leading-none text-mut" aria-label="Voltar">‹</Link>}
      <div className="min-w-0 flex-1">
        {sub && <div className="truncate text-xs text-mut">{sub}</div>}
        <h1 className="h-display truncate text-xl">{title}</h1>
      </div>
      <Link href="/"><Image src="/mark.png" alt="" width={34} height={22} /></Link>
    </header>
  );
}

/** Layout das telas de operação (escuro). */
export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className="op"><main className={`mx-auto min-h-dvh px-4 pb-24 ${wide ? "max-w-6xl" : "max-w-md"}`}>{children}</main></div>;
}

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
      Modo demo: dados fictícios, e suas ações ficam salvas só neste navegador. Configure o Supabase para usar dados reais.
    </div>
  );
}

const tones = {
  ok: "bg-ok/15 text-ok", warn: "bg-warn/15 text-warn", bad: "bg-bad/15 text-bad",
  brand: "bg-brand/20 text-brandl", mut: "bg-white/10 text-mut",
} as const;
export function Pill({ tone = "mut", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "brand" }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-[11px] text-mut">{label}</div>
      <div className={`text-xl font-bold ${tone === "ok" ? "text-ok" : tone === "brand" ? "text-brandl" : ""}`}>{value}</div>
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const ini = name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg,hsl(${hue} 70% 55%),hsl(${(hue + 60) % 360} 70% 40%))` }}>
      {ini}
    </div>
  );
}
