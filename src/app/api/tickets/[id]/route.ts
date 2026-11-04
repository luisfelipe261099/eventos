import { fail, handle, ok } from "@/lib/http";
import { getTicketFull } from "@/lib/repo";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const t = await getTicketFull(id);
  if (!t) return fail("Ingresso não encontrado", 404);
  return ok({ status: t.ticket.status });
});
