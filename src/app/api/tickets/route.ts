import { body, fail, handle, ok } from "@/lib/http";
import { createTicket, markTicketPaid, releaseTicket } from "@/lib/repo";
import { createPixCharge, paymentsEnabled, PaymentError } from "@/lib/payments";
import { isValidCpf } from "@/lib/format";
import { db } from "@/lib/db";
import type { Customer, Ticket } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const b = await body<{ eventId: string; ticketTypeId: string; name: string; phone: string; cpf?: string; ref?: string }>(req);
  if (!b.eventId || !b.ticketTypeId || !b.name?.trim() || !b.phone?.trim()) return fail("Preencha nome e WhatsApp.");
  if (paymentsEnabled() && b.cpf !== undefined && !isValidCpf(b.cpf)) return fail("CPF inválido. Confira os números.");
  const { ticket, ticketType, customer } = await createTicket({ eventId: b.eventId, ticketTypeId: b.ticketTypeId, name: b.name.trim(), phone: b.phone.trim(), cpf: b.cpf || null, promoterId: b.ref || null });
  if (paymentsEnabled() && ticket.price_cents > 0 && !customer.cpf) { await releaseTicket(ticket.id); return fail("Informe o CPF para pagar com Pix."); }
  try {
    const pix = await createPixCharge({
      amountCents: ticket.price_cents, description: `Ingresso ${ticketType.name}`, externalRef: `ticket:${ticket.id}`,
      payer: { name: customer.name, cpf: customer.cpf, phone: customer.phone, email: customer.email, asaasId: customer.asaas_id },
    });
    await db().update<Ticket>("tickets", ticket.id, { payment_id: pix.paymentId });
    if (pix.asaasCustomerId && pix.asaasCustomerId !== customer.asaas_id) await db().update<Customer>("customers", customer.id, { asaas_id: pix.asaasCustomerId });
    if (pix.status === "approved") await markTicketPaid(ticket.id);
    return ok({ ticketId: ticket.id, pix });
  } catch (e) {
    await releaseTicket(ticket.id); // devolve a vaga se a cobrança falhar
    if (e instanceof PaymentError) return fail(`Não foi possível gerar o Pix: ${e.message}`, 502);
    throw e;
  }
});
