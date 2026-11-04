import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { asaasSandbox, ensureWebhook, paymentsEnabled } from "@/lib/payments";

/** Configura o webhook de pagamentos na conta Asaas da casa. */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  if (!paymentsEnabled()) return fail("Cadastre a variável ASAAS_API_KEY na Vercel primeiro.");
  const { email } = await body<{ email: string }>(req);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  if (!email?.includes("@")) return fail("Informe um e-mail para o Asaas avisar se o webhook falhar.");
  const r = await ensureWebhook(appUrl, email);
  return ok({ ...r, sandbox: asaasSandbox() });
});
