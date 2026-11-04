import { body, fail, handle, ok } from "@/lib/http";
import { promoterByCode, promoterGeoCheckin } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  const b = await body<{ k: string; entryId: string; lat: number; lng: number; accuracy?: number }>(req);
  const p = await promoterByCode(b.k);
  if (!p) return fail("Link de promoter inválido.", 403);
  if (!b.entryId || typeof b.lat !== "number" || typeof b.lng !== "number") return fail("Localização inválida.");
  const r = await promoterGeoCheckin(p.id, b.entryId, b);
  return r.ok ? ok(r) : ok({ ...r, error: `Você está fora da área do evento (${r.distance} m da casa).` }, 422);
});
