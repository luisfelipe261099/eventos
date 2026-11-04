import { fail, handle, ok } from "@/lib/http";
import { runVipInvites } from "@/lib/invites";
import { releaseStalePending } from "@/lib/repo";

/** Chamado pelo Vercel Cron (vercel.json) uma vez por dia. */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Não autorizado", 401);
  const released = await releaseStalePending();
  return ok({ ...(await runVipInvites()), released });
});
