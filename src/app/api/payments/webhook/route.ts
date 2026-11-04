import type { Tab } from "@/lib/types";
import { handle, ok } from "@/lib/http";
import { getPayment, paymentsEnabled } from "@/lib/payments";
import { markTicketPaid } from "@/lib/repo";
import { db } from "@/lib/db";

/** Notificação do Mercado Pago. Confirmamos o status consultando a API (não confiamos no corpo). */
export const POST = handle(async (req: Request) => {
  if (!paymentsEnabled()) return ok({ ignored: true });
  const url = new URL(req.url);
  const payload = await req.json().catch(() => ({}));
  const id = payload?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (!id) return ok({ ignored: true });
  const p = await getPayment(String(id));
  if (p.status === "approved") {
    const [kind, ref] = p.external_reference.split(":");
    if (kind === "ticket") await markTicketPaid(ref);
    if (kind === "tab") await db().update<Tab>("tabs", ref, { status: "paid" });
  }
  return ok({ received: true });
});
