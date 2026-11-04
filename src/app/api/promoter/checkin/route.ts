import { body, fail, handle, ok } from "@/lib/http";
import { promoterGeoCheckin } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const b = await body<{ entryId: string; lat: number; lng: number; accuracy?: number }>(req);
  if (!b.entryId || typeof b.lat !== "number" || typeof b.lng !== "number") return fail("Localização inválida");
  const r = await promoterGeoCheckin(b.entryId, b);
  return r.ok ? ok(r) : ok({ ...r, error: `Fora da área do evento (${r.distance} m da casa)` }, 422);
});
