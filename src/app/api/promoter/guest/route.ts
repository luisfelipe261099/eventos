import { body, fail, handle, ok } from "@/lib/http";
import { addGuest, currentEvent, promoterByCode } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const b = await body<{ k: string; name: string; phone: string }>(req);
  const p = await promoterByCode(b.k);
  if (!p) return fail("Link de promoter inválido.", 403);
  if (!b.name?.trim() || !b.phone?.trim()) return fail("Preencha nome e WhatsApp do convidado.");
  const ev = await currentEvent();
  if (!ev) return fail("Nenhum evento agendado no momento.", 404);
  return ok(await addGuest(p.id, ev.id, b.name.trim(), b.phone.trim()));
});
