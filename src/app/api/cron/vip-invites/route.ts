import { fail, handle, ok } from "@/lib/http";
import { runVipInvites } from "@/lib/invites";

/** Chamado pelo Vercel Cron (vercel.json) uma vez por dia. */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Não autorizado", 401);
  return ok(await runVipInvites());
});
