import { fail, handle, ok } from "@/lib/http";
import { getTab } from "@/lib/repo";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const t = await getTab(id);
  return t ? ok(t) : fail("Comanda não encontrada", 404);
});
