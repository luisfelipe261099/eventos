import { fail, handle, ok } from "@/lib/http";
import { currentEvent, promoterView } from "@/lib/repo";

export const GET = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Informe o promoter");
  const ev = await currentEvent();
  if (!ev) return fail("Nenhum evento próximo", 404);
  return ok({ event: ev, ...(await promoterView(id, ev.id)) });
});
