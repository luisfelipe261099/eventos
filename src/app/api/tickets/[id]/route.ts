import { fail, handle, ok } from "@/lib/http";
import { getTicketFull, markTicketPaid, payMode } from "@/lib/repo";
import { getPayment, isPaidStatus } from "@/lib/payments";

/** Resumo público do ingresso (sem a semente do QR). Confere o Pix direto no Asaas se ainda estiver pendente. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  let t = await getTicketFull(id);
  if (!t) return fail("Ingresso não encontrado", 404);
  const mode = t.ticket.status === "pending" && t.ticket.payment_id && !/^(teste|free)-/.test(t.ticket.payment_id) ? await payMode(t.venue?.id) : null;
  if (mode?.kind === "asaas") {
    try {
      const p = await getPayment(mode.cfg, t.ticket.payment_id!);
      if (isPaidStatus(p.status, p.billingType)) { await markTicketPaid(id); t = (await getTicketFull(id))!; }
    } catch { /* o webhook confirma depois */ }
  }
  return ok({
    id: t.ticket.id, status: t.ticket.status, type: t.ticketType?.name ?? "",
    event: t.event ? { name: t.event.name, starts_at: t.event.starts_at, cover_url: t.event.cover_url ?? null } : null,
    venue: t.venue?.name ?? "",
  });
});
