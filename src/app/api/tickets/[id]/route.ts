import { fail, handle, ok } from "@/lib/http";
import { getTicketFull } from "@/lib/repo";

/** Resumo público do ingresso (sem a semente do QR). */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const t = await getTicketFull(id);
  if (!t) return fail("Ingresso não encontrado", 404);
  return ok({
    id: t.ticket.id, status: t.ticket.status, type: t.ticketType?.name ?? "",
    event: t.event ? { name: t.event.name, starts_at: t.event.starts_at, cover_url: t.event.cover_url ?? null } : null,
    venue: t.venue?.name ?? "",
  });
});
