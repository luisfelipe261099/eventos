import { body, fail, handle, ok } from "@/lib/http";
import { createTicket, markTicketPaid } from "@/lib/repo";
import { createPixCharge } from "@/lib/payments";

export const POST = handle(async (req: Request) => {
  const b = await body<{ eventId: string; ticketTypeId: string; name: string; phone: string; ref?: string }>(req);
  if (!b.eventId || !b.ticketTypeId || !b.name?.trim() || !b.phone?.trim()) return fail("Preencha nome e WhatsApp");
  const { ticket, ticketType } = await createTicket({ eventId: b.eventId, ticketTypeId: b.ticketTypeId, name: b.name.trim(), phone: b.phone.trim(), promoterId: b.ref || null });
  const pix = await createPixCharge({ amountCents: ticket.price_cents, description: `Ingresso ${ticketType.name}`, externalRef: `ticket:${ticket.id}` });
  if (pix.status === "approved") await markTicketPaid(ticket.id);
  return ok({ ticketId: ticket.id, pix });
});
