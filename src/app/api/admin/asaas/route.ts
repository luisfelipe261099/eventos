import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { asaas, ensureWebhook, isSandboxKey, PaymentError } from "@/lib/payments";
import { seal } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getVenueOrNull, payMode } from "@/lib/repo";
import type { Venue } from "@/lib/types";

/** Liga o Pix da casa: guarda a chave de API do Asaas dela (cifrada) e cadastra o webhook. */
export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const venue = await getVenueOrNull();
  if (!venue) return fail("Cadastre a casa primeiro.");
  const { apiKey, email } = await body<{ apiKey?: string; email?: string }>(req);
  const key = apiKey?.trim();
  const mail = email?.trim() || venue.owner_email || "";
  if (!mail.includes("@")) return fail("Informe um e-mail para o Asaas avisar se o webhook falhar.");
  try {
    if (key) {
      if (!/^\$aact_/.test(key)) return fail("Esta não parece uma chave de API do Asaas (começa com $aact_).");
      if (key.startsWith("$aact_hmlg_") && process.env.VERCEL_ENV === "production" && process.env.ALLOW_SANDBOX_KEYS !== "1")
        return fail("Esta é uma chave de testes (Sandbox) do Asaas: com ela nenhum Pix é de verdade. Use a chave de produção ($aact_prod_).");
      await asaas({ apiKey: key }, "/finance/balance"); // confere se a chave funciona antes de guardar
      await db().update<Venue>("venues", venue.id, { asaas_key_enc: seal(key) });
    }
    const mode = await payMode(venue.id);
    if (mode.kind !== "asaas") return fail("Cole a chave de API do Asaas da casa.");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const r = await ensureWebhook(mode.cfg, appUrl, mail, venue.id);
    return ok({ ...r, sandbox: isSandboxKey(mode.cfg.apiKey) });
  } catch (e) {
    if (e instanceof PaymentError) return fail(`O Asaas recusou: ${e.message}`, 502);
    throw e;
  }
});

/** Desliga o Pix da casa (apaga a chave guardada). */
export const DELETE = handle(async () => {
  const denied = await guardAdmin(); if (denied) return denied;
  const venue = await getVenueOrNull();
  if (!venue) return fail("Casa não encontrada.", 404);
  await db().update<Venue>("venues", venue.id, { asaas_key_enc: null });
  return ok({ ok: true });
});
