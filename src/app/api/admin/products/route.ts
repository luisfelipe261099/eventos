import { body, guardAdmin, handle, ok } from "@/lib/http";
import { saveProduct } from "@/lib/admin-ops";
import type { Product } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok(await saveProduct(await body<Product>(req)));
});
