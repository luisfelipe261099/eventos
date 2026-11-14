import { fail, guardAdmin, handle, ok } from "@/lib/http";
import { getVenueOrNull } from "@/lib/repo";
import { PayoutError, requestPayout } from "@/lib/payouts";

/** "Receber agora": repassa todo o saldo disponível para a chave Pix da casa. */
export const POST = handle(async () => {
  const denied = await guardAdmin(); if (denied) return denied;
  const venue = await getVenueOrNull();
  if (!venue) return fail("Casa não encontrada.", 404);
  if (venue.has_asaas) return fail("Esta casa recebe direto na própria conta Asaas: não há saldo a repassar.");
  try {
    return ok(await requestPayout(venue.id));
  } catch (e) {
    if (e instanceof PayoutError) return fail(e.message, 409);
    throw e;
  }
});
