import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { syncCheckins } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const b = await body<{ eventId: string; items: { ticketId: string; at: string; gate: string; offline: boolean }[] }>(req);
  if (!b.eventId || !Array.isArray(b.items)) return fail("Dados inválidos");
  return ok({ results: await syncCheckins(b.eventId, b.items.slice(0, 500)) });
});
