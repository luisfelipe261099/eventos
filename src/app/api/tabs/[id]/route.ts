import { fail, handle, ok } from "@/lib/http";
import { getTab } from "@/lib/repo";
import { getPayment, isPaidStatus, paymentsEnabled } from "@/lib/payments";
import { db } from "@/lib/db";
import type { Tab } from "@/lib/types";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  let t = await getTab(id);
  if (!t) return fail("Comanda não encontrada", 404);
  if (t.tab.status === "open" && t.tab.payment_id && paymentsEnabled() && !t.tab.payment_id.startsWith("teste-")) {
    try {
      const p = await getPayment(t.tab.payment_id);
      if (isPaidStatus(p.status, p.billingType)) { await db().update<Tab>("tabs", id, { status: "paid" }); t = (await getTab(id))!; }
    } catch { /* o webhook confirma depois */ }
  }
  return ok({ ...t, requireCpf: paymentsEnabled() });
});
