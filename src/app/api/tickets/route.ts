import { body, fail, handle, ok } from "@/lib/http";
import { createTicket, markTicketPaid, payMode, releaseTicket, venueOfEvent } from "@/lib/repo";
import { createPixCharge, PaymentError } from "@/lib/payments";
import { isValidCpf } from "@/lib/format";
import { db } from "@/lib/db";
import type { Customer, Ticket, TicketType } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const b = await body<{ eventId: string; ticketTypeId: string; name: string; phone: string; cpf?: string; ref?: string }>(req);
  if (!b.eventId || !b.ticketTypeId || !b.name?.trim() || !b.phone?.trim()) return fail("Preencha nome e WhatsApp.");
  const [venue, lot] = await Promise.all([venueOfEvent(b.eventId), db().get<TicketType>("ticket_types", b.ticketTypeId)]);
  if (!venue || !lot) return fail("Evento não encontrado.", 404);
  if (venue.plan_status === "blocked") return fail("As vendas desta casa estão pausadas no momento.", 403);
  const mode = await payMode(venue.id);
  const paid = lot.price_cents > 0;
  if (paid && mode.kind === "off") return fail("Esta casa ainda não ativou a venda online. Fale com a casa para comprar.", 409);
  const needCpf = paid && mode.kind === "asaas";
  if (needCpf && !isValidCpf(b.cpf ?? "")) return fail(b.cpf ? "CPF inválido. Confira os números." : "Informe o CPF para pagar com Pix.");
  const { ticket, ticketType, customer, chargeCents } = await createTicket({ eventId: b.eventId, ticketTypeId: b.ticketTypeId, name: b.name.trim(), phone: b.phone.trim(), cpf: needCpf ? b.cpf : null, promoterId: b.ref || null });
  try {
    const pix = await createPixCharge(mode.kind === "asaas" ? mode.cfg : null, {
      amountCents: chargeCents, feeCents: ticket.fee_cents ?? 0, description: `Ingresso ${ticketType.name}`, externalRef: `ticket:${ticket.id}`,
      // o cadastro no Asaas é por conta: cada casa tem o próprio, então não reaproveita id entre casas
      payer: { name: customer.name, cpf: customer.cpf, phone: customer.phone, email: customer.email },
    });
    await db().update<Ticket>("tickets", ticket.id, { payment_id: pix.paymentId, fee_split: pix.feeSplit });
    if (pix.asaasCustomerId && pix.asaasCustomerId !== customer.asaas_id) await db().update<Customer>("customers", customer.id, { asaas_id: pix.asaasCustomerId });
    if (pix.status === "approved") await markTicketPaid(ticket.id);
    return ok({ ticketId: ticket.id, pix });
  } catch (e) {
    await releaseTicket(ticket.id); // devolve a vaga se a cobrança falhar
    if (e instanceof PaymentError) return fail(`Não foi possível gerar o Pix: ${e.message}`, 502);
    throw e;
  }
});
