"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { dayNum, Icon, longDate, monthShort } from "@/components/client";

type T = { id: string; status: string; type: string; venue: string; event: { name: string; starts_at: string; cover_url: string | null } | null };

const TILES = [
  { href: "/", title: "Comprar ingressos", desc: "Veja a agenda da semana", img: "/posters/baile-neon.jpg" },
  { href: "#ingressos", title: "Meus ingressos", desc: "QR code para a entrada", img: "/posters/sexta-open-bar.jpg" },
  { href: "/cardapio/casa-demo", title: "Cardápio e comanda", desc: "Peça sem sair da pista", img: "/posters/pagode-de-mesa.jpg" },
  { href: "https://wa.me/5541900000000", title: "Precisa de ajuda?", desc: "Fale com o suporte", img: "/posters/subsolo-techno.jpg" },
];

export default function Account() {
  const [profile, setProfile] = useState<{ name?: string; phone?: string }>({});
  const [tickets, setTickets] = useState<T[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    setProfile(JSON.parse(localStorage.getItem("vf_profile") ?? "{}"));
    setTab(localStorage.getItem("vf_tab"));
    const ids: string[] = JSON.parse(localStorage.getItem("vf_tickets") ?? "[]");
    Promise.all(ids.slice(0, 20).map((id) => fetch(`/api/tickets/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((xs) => setTickets(xs.filter(Boolean)));
  }, []);

  const first = profile.name?.split(" ")[0];
  const upcoming = (tickets ?? []).filter((t) => t.event && new Date(t.event.starts_at).getTime() > Date.now() - 8 * 36e5);
  const past = (tickets ?? []).filter((t) => !upcoming.includes(t));
  const tiles = TILES.map((t) => (t.href.startsWith("/cardapio") && tab ? { ...t, href: `/comanda/${tab}`, desc: "Sua comanda está aberta" } : t));

  return (
    <div className="mx-auto max-w-md pt-6">
      <h1 className="h-display text-[32px]">{first ? `Olá, ${first}` : "Minha conta"}</h1>
      {!first && <p className="mt-1 text-nevoa">Seus ingressos ficam salvos neste celular depois da primeira compra.</p>}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="relative flex aspect-[1/1.05] flex-col justify-end overflow-hidden rounded-[22px] p-4 text-white">
            <Image src={t.img} alt="" fill sizes="45vw" className="scale-110 object-cover blur-[3px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/35" />
            <div className="relative"><div className="font-semibold leading-tight">{t.title}</div><div className="mt-0.5 text-xs text-white/70">{t.desc}</div></div>
          </Link>
        ))}
      </div>

      <h2 id="ingressos" className="h-display mt-10 scroll-mt-20 text-[26px]">Meus ingressos</h2>
      {tickets === null ? <p className="mt-4 text-nevoa">Carregando…</p> : upcoming.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-linha p-6 text-center">
          <p className="text-nevoa">Você ainda não tem ingressos para os próximos dias.</p>
          <Link href="/" className="btn-primary mt-4">Ver eventos</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {upcoming.map((t) => (
            <li key={t.id}>
              <Link href={`/ingresso/${t.id}`} className="stub flex items-center gap-4 overflow-hidden p-3 pr-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-breu">{t.event?.cover_url && <Image src={t.event.cover_url} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="poster truncate text-[22px] uppercase">{t.event?.name}</div>
                  <div className="truncate text-sm text-nevoa">{t.event && longDate(t.event.starts_at)}</div>
                  <div className="truncate text-sm text-nevoa">{t.venue} · {t.type}</div>
                </div>
                <div className="flex flex-col items-center text-violeta"><Icon name="ticket" size={22} /><span className="mt-1 text-[11px] font-semibold">Abrir</span></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <>
          <h3 className="mt-8 text-sm font-semibold text-nevoa">Eventos que você foi</h3>
          <ul className="mt-2 divide-y divide-linha">
            {past.map((t) => t.event && (
              <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="poster w-10 text-center text-xl">{dayNum(t.event.starts_at)}<span className="block text-[10px] font-semibold text-nevoa">{monthShort(t.event.starts_at)}</span></span>
                <span className="flex-1">{t.event.name}</span><span className="text-nevoa">{t.venue}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
