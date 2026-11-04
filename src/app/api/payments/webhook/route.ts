import { NextResponse } from "next/server";
import { getPayment, isPaidStatus, paymentsEnabled, webhookToken } from "@/lib/payments";
import { applyPaymentRef } from "@/lib/repo";

/**
 * Webhook do Asaas. Valida o header asaas-access-token e, por segurança,
 * confere o status consultando a API (não confia só no corpo).
 * Idempotente: o Asaas pode reenviar o mesmo evento.
 */
export async function POST(req: Request) {
  if (!paymentsEnabled()) return NextResponse.json({ ignored: true });
  const token = req.headers.get("asaas-access-token");
  const expected = [await webhookToken(), process.env.ASAAS_WEBHOOK_TOKEN].filter(Boolean);
  if (!token || !expected.includes(token)) return NextResponse.json({ error: "token inválido" }, { status: 401 });

  const evt = await req.json().catch(() => null);
  const paymentId: string | undefined = evt?.payment?.id;
  if (!paymentId) return NextResponse.json({ received: true });
  try {
    const p = await getPayment(paymentId);
    if (isPaidStatus(p.status, p.billingType)) await applyPaymentRef(p.externalReference);
  } catch (e) {
    console.error("[webhook asaas]", e);
    return NextResponse.json({ error: "falha temporária" }, { status: 500 }); // o Asaas tenta de novo
  }
  return NextResponse.json({ received: true });
}
