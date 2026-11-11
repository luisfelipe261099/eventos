import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getVenueOrNull, listEvents } from "@/lib/repo";
import type { Checkin, TicketType } from "@/lib/types";
import { brl, fmtDate, fmtTime } from "@/lib/format";
import { Page, Pill, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos" };

export default async function EventosAdmin() {
  const venue = await getVenueOrNull();
  const [events, types, checkins] = await Promise.all([venue ? listEvents(venue.id) : [], db().select<TicketType>("ticket_types"), db().select<Checkin>("checkins")]);
  const now = Date.now() - 8 * 36e5;
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now).reverse().slice(0, 12);
  const row = (e: (typeof events)[number]) => {
    const t = types.filter((x) => x.event_id === e.id);
    const sold = t.reduce((s, x) => s + x.sold, 0), cap = t.reduce((s, x) => s + x.quantity, 0);
    const rev = t.reduce((s, x) => s + x.sold * x.price_cents, 0);
    const inside = checkins.filter((c) => c.event_id === e.id).length;
    return (
      <li key={e.id}>
        <Link href={`/admin/eventos/${e.id}`} className="card flex items-center gap-4 hover:border-brand/60">
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-black">{e.cover_url && <Image src={e.cover_url} alt="" fill sizes="64px" className="object-cover" />}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{e.name}</div>
            <div className="text-sm text-mut">{fmtDate(e.starts_at)} · {fmtTime(e.starts_at)}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs"><Pill tone="brand">{sold}/{cap} vendidos</Pill><Pill tone="ok">{brl(rev)}</Pill>{inside > 0 && <Pill>{inside} entraram</Pill>}</div>
          </div>
          <span className="text-mut">Editar ›</span>
        </Link>
      </li>
    );
  };
  return (
    <Page wide>
      <TopBar title="Eventos" sub="Agenda e ingressos" back="/" />
      <AdminNav active="/admin/eventos" />
      <div className="flex items-center justify-between"><h2 className="h-display text-xl">Próximos</h2><Link className="btn" href="/admin/eventos/novo">+ Novo evento</Link></div>
      {upcoming.length === 0 ? <p className="mt-4 text-mut">Nenhum evento agendado. Crie o primeiro.</p> : <ul className="mt-4 grid gap-3 md:grid-cols-2">{upcoming.map(row)}</ul>}
      {past.length > 0 && <><h2 className="h-display mt-10 text-xl">Anteriores</h2><ul className="mt-4 grid gap-3 md:grid-cols-2">{past.map(row)}</ul></>}
    </Page>
  );
}
