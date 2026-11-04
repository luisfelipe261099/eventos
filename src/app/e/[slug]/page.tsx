import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug, getTicketTypes } from "@/lib/repo";
import { ClientShell, Flyer, Icon, longDate } from "@/components/client";
import BuyForm from "./BuyForm";
import { paymentsEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  return ev ? { title: ev.name, openGraph: { images: ev.cover_url ? [ev.cover_url] : [] } } : {};
}

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();
  const types = (await getTicketTypes(ev.id)).sort((a, b) => a.price_cents - b.price_cents);

  return (
    <ClientShell back="/" bare>
      <div className="bg-breu">
        <div className="mx-auto max-w-md">
          <Flyer src={ev.cover_url} alt={ev.name} sizes="448px" priority />
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-7 max-w-md">
        <div className="rounded-t-[28px] bg-papel px-5 pb-28 pt-7">
          <h1 className="poster text-[44px] uppercase">{ev.name}</h1>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex gap-3"><Icon name="calendar" className="mt-0.5 shrink-0 text-nevoa" /><dd>{longDate(ev.starts_at)}</dd></div>
            <div className="flex gap-3"><Icon name="pin" className="mt-0.5 shrink-0 text-nevoa" /><dd><b className="font-semibold">{ev.venue?.name}</b><br /><span className="text-nevoa">{ev.venue?.address}</span></dd></div>
            <div className="flex gap-3"><Icon name="id" className="mt-0.5 shrink-0 text-nevoa" /><dd>Proibido para menores de {ev.min_age ?? 18} anos. Leve documento com foto.</dd></div>
          </dl>
          {ev.description && <p className="mt-5 leading-relaxed text-tinta/85">{ev.description}</p>}
          <h2 className="h-display mt-9 text-[26px]">Ingressos</h2>
          <BuyForm eventId={ev.id} types={types} referral={ref ?? null} requireCpf={paymentsEnabled()} />
        </div>
      </div>
    </ClientShell>
  );
}
