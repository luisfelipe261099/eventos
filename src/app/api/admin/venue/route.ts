import { body, guardAdmin, handle, ok } from "@/lib/http";
import { saveVenue } from "@/lib/admin-ops";
import type { Venue } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok(await saveVenue(await body<Venue>(req)));
});
