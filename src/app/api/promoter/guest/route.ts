import { body, fail, handle, ok } from "@/lib/http";
import { addGuest, currentEvent } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const b = await body<{ promoterId: string; name: string; phone: string }>(req);
  if (!b.promoterId || !b.name?.trim() || !b.phone?.trim()) return fail("Preencha nome e WhatsApp");
  const ev = await currentEvent();
  if (!ev) return fail("Nenhum evento próximo", 404);
  return ok(await addGuest(b.promoterId, ev.id, b.name.trim(), b.phone.trim()));
});
