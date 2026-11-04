import { notFound } from "next/navigation";
import { db, hasSupabaseStorage, postgresUrl } from "@/lib/db";
import type { EventItem, TicketType } from "@/lib/types";
import { isoToBrLocal } from "@/lib/admin-ops";
import { Page, TopBar } from "@/components/ui";
import AdminNav from "../../AdminNav";
import EventForm from "./EventForm";
import TicketsList from "./TicketsList";
import type { Customer, Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Evento" };

export default async function EventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "novo";
  const ev = isNew ? null : await db().get<EventItem>("events", id);
  if (!isNew && !ev) notFound();
  const lots = ev ? (await db().select<TicketType>("ticket_types", { event_id: ev.id })).sort((a, b) => a.price_cents - b.price_cents) : [];
  const [tks, custs] = ev ? await Promise.all([db().select<Ticket>("tickets", { event_id: ev.id }), db().select<Customer>("customers")]) : [[], []];
  const cmap = new Map(custs.map((c) => [c.id, c])); const lmap = new Map(lots.map((l) => [l.id, l.name]));
  const ticketRows = tks.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((t) => ({ id: t.id, name: cmap.get(t.customer_id)?.name ?? "—", phone: cmap.get(t.customer_id)?.phone ?? "", type: lmap.get(t.ticket_type_id) ?? "", price_cents: t.price_cents, status: t.status, created_at: t.created_at, is_free: t.is_free }));
  return (
    <Page wide>
      <TopBar title={isNew ? "Novo evento" : ev!.name} sub="Eventos" back="/admin/eventos" />
      <AdminNav active="/admin/eventos" />
      <EventForm canUpload={Boolean(postgresUrl()) || hasSupabaseStorage()} initial={{
        id: ev?.id, slug: ev?.slug, name: ev?.name ?? "", starts_local: ev ? isoToBrLocal(ev.starts_at) : "", category: ev?.category ?? "Festas",
        description: ev?.description ?? "", min_age: ev?.min_age ?? 18, capacity: ev?.capacity ?? 500, cover_url: ev?.cover_url ?? "",
        lots: lots.length ? lots.map((l) => ({ id: l.id, name: l.name, price_cents: l.price_cents, quantity: l.quantity, sold: l.sold })) : [{ name: "Pista · 1º lote", price_cents: 5000, quantity: 300, sold: 0 }],
      }} />
      {ev && <TicketsList initial={ticketRows} />}
    </Page>
  );
}
