import { body, fail, handle, ok } from "@/lib/http";
import { currentEvent, openOrAddToTab } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const b = await body<{ tabId?: string; table: string; name: string; phone: string; items: { productId: string; qty: number }[] }>(req);
  const ev = await currentEvent();
  if (!ev) return fail("Nenhum evento acontecendo agora", 404);
  if (!Array.isArray(b.items) || !b.items.length) return fail("Carrinho vazio");
  const tab = await openOrAddToTab({ tabId: b.tabId, eventId: ev.id, table: b.table || "Pista", name: b.name, phone: b.phone, items: b.items });
  return ok({ tabId: tab.id });
});
