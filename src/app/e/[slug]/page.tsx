import { notFound } from "next/navigation";
import { getEventBySlug, getTicketTypes } from "@/lib/repo";
import { fmtDate, fmtTime } from "@/lib/format";
import { Page, TopBar } from "@/components/ui";
import BuyForm from "./BuyForm";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();
  const types = (await getTicketTypes(ev.id)).sort((a, b) => a.price_cents - b.price_cents);
  return (
    <Page>
      <TopBar title="Ingressos" sub="Evento" back="/" />
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="flex h-40 flex-col justify-end p-4" style={{ background: "radial-gradient(circle at 25% 30%, #c46bff, transparent 55%), radial-gradient(circle at 85% 80%, #3b5bff, transparent 50%), #1a0f3a" }}>
          <span className="text-xs font-bold tracking-widest text-[#f3d9ff]">{fmtDate(ev.starts_at).toUpperCase()} · {fmtTime(ev.starts_at)}</span>
          <h2 className="h-display text-3xl">{ev.name}</h2>
        </div>
      </div>
      <BuyForm eventId={ev.id} types={types} referral={ref ?? null} />
    </Page>
  );
}
