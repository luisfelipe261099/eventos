import { fail, handle, ok } from "@/lib/http";
import { runVipInvites } from "@/lib/invites";
import { listVenues, releaseStalePending } from "@/lib/repo";
import { isSupabaseConfigured } from "@/lib/db";
import { syncAllBilling } from "@/lib/billing";
import { runPayouts } from "@/lib/payouts";
import { reconcileCustody } from "@/lib/repo";

export const maxDuration = 60;

/** Chamado pelo Vercel Cron (vercel.json) uma vez por dia: convites VIP de cada casa, Pix vencido e mensalidades. */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") return fail("Configure CRON_SECRET.", 503);
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Não autorizado", 401);
  const released = await releaseStalePending();
  if (!isSupabaseConfigured()) return ok({ ...(await runVipInvites()), released });
  const venues = [];
  for (const v of await listVenues()) {
    if (v.plan_status === "blocked") continue;
    const r = await runVipInvites({ venueId: v.id }).catch(() => ({ event: null, invited: [] }));
    venues.push({ venue: v.name, event: r.event, invited: r.invited.length });
  }
  const billing = await syncAllBilling().catch((e) => ({ error: String(e) }));
  const credited = await reconcileCustody().catch((e) => ({ error: String(e) })); // venda paga que ficou sem crédito no extrato
  const payouts = await runPayouts().catch((e) => ({ error: String(e) }));
  return ok({ venues, released, billing, credited, payouts });
});
