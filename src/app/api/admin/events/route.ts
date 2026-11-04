import { body, guardAdmin, handle, ok } from "@/lib/http";
import { saveEvent, type EventInput } from "@/lib/admin-ops";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok(await saveEvent(await body<EventInput>(req)));
});
