import { body, guardAdmin, handle, ok } from "@/lib/http";
import { saveVenue } from "@/lib/admin-ops";
import { getVenueById } from "@/lib/repo";
import type { Venue } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const v = await saveVenue(await body<Venue>(req));
  return ok(v ? await getVenueById(v.id) : null); // sem os segredos da casa
});
