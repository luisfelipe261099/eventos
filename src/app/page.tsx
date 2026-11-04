import Link from "next/link";
import { Logo } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/db";
import { currentEvent, getVenue } from "@/lib/repo";

export const dynamic = "force-dynamic";

const modules = [
  { href: "/e/{slug}", icon: "🎟️", title: "App do cliente", desc: "Compra de ingresso e QR code dinâmico" },
  { href: "/cardapio/{venue}?mesa=12", icon: "🍹", title: "Cardápio digital", desc: "Pedido pelo celular e comanda ao vivo" },
  { href: "/promoter", icon: "📍", title: "App do promoter", desc: "Lista VIP, geolocalização e comissão" },
  { href: "/portaria", icon: "⚡", title: "Portaria", desc: "Leitor de QR que funciona sem internet" },
  { href: "/admin", icon: "📊", title: "Painel do dono", desc: "Portaria, bar, comandas e IA" },
];

export default async function Home() {
  const [ev, venue] = await Promise.all([currentEvent(), getVenue()]);
  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-10">
      <Logo h={44} />
      <h1 className="h-display mt-8 text-4xl leading-tight">
        Gestão inteligente para <span className="text-brandl">casas de eventos e bares.</span>
      </h1>
      <p className="mt-4 text-mut">Check-in ultrarrápido mesmo sem internet, cardápio digital, comandas, promoters e IA que entende seus clientes e o seu bar.</p>
      {!isSupabaseConfigured() && (
        <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">Rodando em modo demo, com dados fictícios. Veja o README para conectar o Supabase.</p>
      )}
      <div className="mt-8 grid gap-3">
        {modules.map((m) => (
          <Link key={m.title} href={m.href.replace("{slug}", ev?.slug ?? "").replace("{venue}", venue.slug)} className="card flex items-center gap-4 transition hover:border-brand/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand2 text-2xl">{m.icon}</div>
            <div className="flex-1"><div className="font-semibold">{m.title}</div><div className="text-sm text-mut">{m.desc}</div></div>
            <span className="text-mut">›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
