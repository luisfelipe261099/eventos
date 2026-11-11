import { fail, guardAdmin, handle, ok } from "@/lib/http";
import { currentEvent, doorManifest, ownedEvent } from "@/lib/repo";

/** Lista de ingressos + sementes que a portaria guarda no aparelho para validar offline. */
export const GET = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const url = new URL(req.url);
  const ev = url.searchParams.get("event") ? await ownedEvent(url.searchParams.get("event")!) : await currentEvent();
  if (!ev) return fail("Nenhum evento próximo", 404);
  const tickets = await doorManifest(ev.id);
  return ok({ eventId: ev.id, downloadedAt: new Date().toISOString(), tickets });
});
