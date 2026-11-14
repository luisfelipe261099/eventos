import { fail, handle, ok } from "@/lib/http";
import { confirmPayment, getTab, payMode, venueOfEvent } from "@/lib/repo";
import { getPayment, isPaidStatus } from "@/lib/payments";
import { db } from "@/lib/db";
import type { Tab } from "@/lib/types";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  let t = await getTab(id);
  if (!t) return fail("Comanda não encontrada", 404);
  const mode = await payMode((await venueOfEvent(t.tab.event_id))?.id);
  if (t.tab.status === "open" && t.tab.payment_id && mode.kind === "asaas" && !t.tab.payment_id.startsWith("teste-")) {
    try {
      const p = await getPayment(mode.cfg, t.tab.payment_id);
      if (isPaidStatus(p.status, p.billingType)) { await confirmPayment("tab", id, p, mode); t = (await getTab(id))!; }
    } catch { /* o webhook confirma depois */ }
  }
  return ok({ ...t, requireCpf: mode.kind === "asaas", payOnline: mode.kind !== "off" });
});
