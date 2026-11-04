import { notFound } from "next/navigation";
import Image from "next/image";
import { getTicketFull } from "@/lib/repo";
import { brl } from "@/lib/format";
import { ClientShell, Icon, longDate } from "@/components/client";
import DynamicQR from "@/components/DynamicQR";
import TicketActions from "@/components/TicketActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu ingresso" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTicketFull(id);
  if (!t || !t.event) notFound();
  const { ticket, event, customer, ticketType, venue } = t;
  const status = ticket.status === "refunded" ? { t: "Estornado", c: "bg-linha text-nevoa" } : ticket.status === "cancelled" ? { t: "Cancelado", c: "bg-linha text-nevoa" } : ticket.status === "used" ? { t: "Já utilizado", c: "bg-linha text-nevoa" } : ticket.status === "paid" ? { t: "Válido", c: "bg-[#e3f6ec] text-verde" } : { t: "Aguardando pagamento", c: "bg-[#fff1dc] text-[#9a5b00]" };

  return (
    <div className="min-h-dvh bg-breu">
      <ClientShell back="/conta" bare>
        <div className="mx-auto max-w-md px-5 pb-12 pt-4" style={{ ["--cut" as string]: "#000" }}>
          <div className="stub overflow-hidden">
            <div className="relative h-44">
              {event.cover_url && <Image src={event.cover_url} alt="" fill sizes="448px" className="object-cover object-top" priority />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-5 bottom-4 text-white">
                <h1 className="poster text-[36px] uppercase">{event.name}</h1>
              </div>
            </div>
            <div className="space-y-2 px-5 pb-4 pt-4 text-[15px]">
              <p className="flex gap-2.5"><Icon name="calendar" size={18} className="mt-0.5 shrink-0 text-nevoa" />{longDate(event.starts_at)}</p>
              <p className="flex gap-2.5"><Icon name="pin" size={18} className="mt-0.5 shrink-0 text-nevoa" />{venue?.name}</p>
            </div>

            <div className="stub-cut" aria-hidden><i /></div>

            <div className="px-5 pb-6 pt-2">
              {ticket.status === "cancelled" || ticket.status === "refunded" ? (
                <p className="py-16 text-center text-nevoa">Este ingresso foi {ticket.status === "refunded" ? "estornado" : "cancelado"} e não vale para a entrada.</p>
              ) : ticket.status === "pending" ? (
                <p className="py-16 text-center text-nevoa">Assim que o Pix for confirmado, o QR code aparece aqui.</p>
              ) : (
                <DynamicQR ticketId={ticket.id} seed={ticket.qr_seed} />
              )}
              <div className="mt-6 flex items-end justify-between gap-3 border-t border-linha pt-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{customer?.name}</div>
                  <div className="text-sm text-nevoa">{ticketType?.name}{ticket.is_free ? " · cortesia" : ticket.price_cents ? ` · ${brl(ticket.price_cents)}` : ""}</div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.c}`}>{status.t}</span>
              </div>
            </div>
          </div>
          {ticket.status !== "cancelled" && ticket.status !== "refunded" && <TicketActions title={event.name} startsAt={event.starts_at} place={[venue?.name, venue?.address].filter(Boolean).join(", ")} />}
          <p className="mt-5 text-center text-sm leading-relaxed text-white/60">Mostre este código na entrada. Ele muda a cada 30 segundos, então print de tela não funciona. Depois de aberto uma vez, funciona sem internet.</p>
        </div>
      </ClientShell>
    </div>
  );
}
