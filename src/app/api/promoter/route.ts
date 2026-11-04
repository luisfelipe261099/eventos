import { fail, handle, ok } from "@/lib/http";
import { currentEvent, promoterByCode, promoterView } from "@/lib/repo";

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const p = await promoterByCode(url.searchParams.get("k") ?? url.searchParams.get("id"));
  if (!p) return fail("Link de promoter inválido ou desativado. Peça um novo para a casa.", 403);
  const ev = await currentEvent();
  if (!ev) return fail("Nenhum evento agendado no momento.", 404);
  return ok({ event: ev, ...(await promoterView(p.id, ev.id)) });
});
