import { body, guardAdmin, handle, ok } from "@/lib/http";
import { savePromoter } from "@/lib/admin-ops";
import type { Promoter } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok(await savePromoter(await body<Promoter>(req)));
});
