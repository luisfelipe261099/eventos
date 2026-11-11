import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { ownedEvent, payMode, releaseTicket } from "@/lib/repo";
import { refundPayment, PaymentError } from "@/lib/payments";
import type { Ticket, TicketType } from "@/lib/types";

/** Cancelar ingresso pendente ou estornar ingresso pago (devolve o Pix e libera a vaga). */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const { id, action } = await body<{ id: string; action: "cancel" | "refund" }>(req);
  const t = await db().get<Ticket>("tickets", id);
  const ev = t ? await ownedEvent(t.event_id) : null;
  if (!t || !ev) return fail("Ingresso não encontrado.", 404);
  if (action === "cancel") {
    if (t.status !== "pending") return fail("Só é possível cancelar ingressos aguardando pagamento.");
    await releaseTicket(id);
    return ok({ status: "cancelled" });
  }
  if (action === "refund") {
    if (t.status === "used") return fail("Este ingresso já foi usado na entrada e não pode ser estornado.");
    if (t.status !== "paid") return fail("Só é possível estornar ingressos pagos.");
    try {
      if (t.price_cents > 0 && t.payment_id) { const mode = await payMode(ev.venue_id); await refundPayment(mode.kind === "asaas" ? mode.cfg : null, t.payment_id); }
    } catch (e) {
      if (e instanceof PaymentError) return fail(`O Asaas recusou o estorno: ${e.message}`, 502);
      throw e;
    }
    await db().update<Ticket>("tickets", id, { status: "refunded", refunded_at: new Date().toISOString() });
    const tt = await db().get<TicketType>("ticket_types", t.ticket_type_id);
    if (tt && tt.sold > 0) await db().update<TicketType>("ticket_types", tt.id, { sold: tt.sold - 1 });
    return ok({ status: "refunded" });
  }
  return fail("Ação inválida.");
});
