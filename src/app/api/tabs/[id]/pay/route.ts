import type { Tab } from "@/lib/types";
import { fail, handle, ok } from "@/lib/http";
import { getTab } from "@/lib/repo";
import { createPixCharge } from "@/lib/payments";
import { db } from "@/lib/db";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const t = await getTab(id);
  if (!t) return fail("Comanda não encontrada", 404);
  if (t.tab.status === "paid") return ok({ status: "approved" });
  const pix = await createPixCharge({ amountCents: t.total, description: `Comanda ${t.tab.table_label}`, externalRef: `tab:${id}` });
  if (pix.status === "approved") await db().update<Tab>("tabs", id, { status: "paid" });
  return ok({ pix });
});
