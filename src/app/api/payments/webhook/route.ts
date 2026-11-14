import { NextResponse } from "next/server";
import { getPayment, isPaidStatus, platformCfg, PLATFORM_HOOK, webhookToken, type AsaasTransfer } from "@/lib/payments";
import { applyPaymentRef, payMode, type PayMode } from "@/lib/repo";
import { applyTransfer } from "@/lib/payouts";

/**
 * Webhook do Asaas.
 * - ?v=ID_DA_CASA: conta Asaas própria da casa (token derivado da chave dela).
 * - ?v=plataforma: conta da Casa Cheia, que recebe as vendas das casas sem conta própria,
 *   as mensalidades e os avisos dos repasses.
 * Valida o header asaas-access-token e confere o status consultando a API (não confia só no corpo).
 * Idempotente: o Asaas pode reenviar o mesmo evento.
 */
export async function POST(req: Request) {
  const v = new URL(req.url).searchParams.get("v") ?? "";
  const platform = v === PLATFORM_HOOK ? platformCfg() : null;
  const mode: PayMode = platform ? { kind: "asaas", cfg: platform, custody: true } : await payMode(v);
  if (mode.kind !== "asaas" || (!platform && mode.custody)) return NextResponse.json({ ignored: true });
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== (await webhookToken(mode.cfg))) return NextResponse.json({ error: "token inválido" }, { status: 401 });

  const evt = await req.json().catch(() => null);
  try {
    if (platform && evt?.transfer?.id) {
      await applyTransfer(evt.transfer as AsaasTransfer); // repasse concluído, falhou ou foi cancelado
      return NextResponse.json({ received: true });
    }
    const paymentId: string | undefined = evt?.payment?.id;
    if (!paymentId) return NextResponse.json({ received: true });
    const p = await getPayment(mode.cfg, paymentId);
    if (platform && p.externalReference?.startsWith("venue:")) {
      const { syncBilling } = await import("@/lib/billing"); // mensalidade paga ou atrasada: atualiza a casa na hora
      await syncBilling(p.externalReference.slice(6));
      return NextResponse.json({ received: true });
    }
    const hookVenue = platform ? null : v;
    if (isPaidStatus(p.status, p.billingType)) await applyPaymentRef(p, mode, hookVenue, "paid");
    else if (p.status === "REFUNDED") await applyPaymentRef(p, mode, hookVenue, "refunded"); // estornado direto no Asaas
    else if (p.deleted) await applyPaymentRef(p, mode, hookVenue, "deleted"); // cobrança apagada no Asaas
  } catch (e) {
    console.error("[webhook asaas]", e);
    return NextResponse.json({ error: "falha temporária" }, { status: 500 }); // o Asaas tenta de novo
  }
  return NextResponse.json({ received: true });
}
