import { fail, handle, ok } from "@/lib/http";
import { getTicketFull, markTicketPaid } from "@/lib/repo";
import { getPayment, isPaidStatus, paymentsEnabled } from "@/lib/payments";

/** Resumo público do ingresso (sem a semente do QR). Confere o Pix direto no Asaas se ainda estiver pendente. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  let t = await getTicketFull(id);
  if (!t) return fail("Ingresso não encontrado", 404);
  if (t.ticket.status === "pending" && t.ticket.payment_id && paymentsEnabled() && !t.ticket.payment_id.startsWith("teste-")) {
    try {
      const p = await getPayment(t.ticket.payment_id);
      if (isPaidStatus(p.status, p.billingType)) { await markTicketPaid(id); t = (await getTicketFull(id))!; }
    } catch { /* o webhook confirma depois */ }
  }
  return ok({
    id: t.ticket.id, status: t.ticket.status, type: t.ticketType?.name ?? "",
    event: t.event ? { name: t.event.name, starts_at: t.event.starts_at, cover_url: t.event.cover_url ?? null } : null,
    venue: t.venue?.name ?? "",
  });
});
