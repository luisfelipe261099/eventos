import { body, fail, handle, ok } from "@/lib/http";
import { currentEvent, getVenueBySlug, openOrAddToTab } from "@/lib/repo";
import { db } from "@/lib/db";
import type { Tab } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const b = await body<{ venue?: string; tabId?: string; table: string; name: string; phone: string; items: { productId: string; qty: number }[] }>(req);
  // a casa vem do link do cardápio; comanda já aberta continua no evento dela
  const open = b.tabId ? await db().get<Tab>("tabs", b.tabId) : null;
  const venue = b.venue ? await getVenueBySlug(b.venue) : null;
  const ev = open?.status === "open" ? { id: open.event_id } : venue ? await currentEvent(venue.id) : await currentEvent(); // sem casa no pedido: só vale no modo demo
  if (!ev) return fail("Nenhum evento acontecendo agora", 404);
  if (!Array.isArray(b.items) || !b.items.length) return fail("Carrinho vazio");
  const tab = await openOrAddToTab({ tabId: b.tabId, eventId: ev.id, table: b.table || "Pista", name: b.name, phone: b.phone, items: b.items });
  return ok({ tabId: tab.id });
});
