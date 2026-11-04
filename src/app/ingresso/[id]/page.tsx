import { notFound } from "next/navigation";
import { getTicketFull } from "@/lib/repo";
import { fmtDate, fmtTime } from "@/lib/format";
import { Page, Pill, TopBar } from "@/components/ui";
import DynamicQR from "@/components/DynamicQR";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTicketFull(id);
  if (!t || !t.event) notFound();
  const { ticket, event, customer, ticketType } = t;
  return (
    <Page>
      <TopBar title="Meu ingresso" sub={event.name} back={`/e/${event.slug}`} />
      <div className="card text-center">
        <div className="text-sm text-mut">{fmtDate(event.starts_at)} · {fmtTime(event.starts_at)} · {ticketType?.name}</div>
        {ticket.status === "pending" ? (
          <p className="my-10 text-warn">Aguardando confirmação do pagamento…</p>
        ) : (
          <DynamicQR ticketId={ticket.id} seed={ticket.qr_seed} />
        )}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 p-3 text-left">
          <div><div className="font-semibold">{customer?.name}</div><div className="text-xs text-mut">{ticket.is_free ? "Cortesia VIP 🎁" : "Ingresso pago"}</div></div>
          <Pill tone={ticket.status === "used" ? "mut" : ticket.status === "paid" ? "ok" : "warn"}>{ticket.status === "used" ? "Utilizado" : ticket.status === "paid" ? "Válido" : "Pendente"}</Pill>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-mut">O código muda a cada 30 segundos. Print de tela não funciona na porta.<br />Funciona mesmo sem internet depois de aberto uma vez.</p>
    </Page>
  );
}
