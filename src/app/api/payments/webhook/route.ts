import { NextResponse } from "next/server";
import { getPayment, isPaidStatus, webhookToken } from "@/lib/payments";
import { applyPaymentRef, payMode } from "@/lib/repo";

/**
 * Webhook do Asaas, um por casa (?v=ID_DA_CASA). Valida o header
 * asaas-access-token com o token daquela casa e, por segurança, confere o
 * status consultando a API (não confia só no corpo).
 * Idempotente: o Asaas pode reenviar o mesmo evento.
 */
export async function POST(req: Request) {
  const mode = await payMode(new URL(req.url).searchParams.get("v"));
  if (mode.kind !== "asaas") return NextResponse.json({ ignored: true });
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== (await webhookToken(mode.cfg))) return NextResponse.json({ error: "token inválido" }, { status: 401 });

  const evt = await req.json().catch(() => null);
  const paymentId: string | undefined = evt?.payment?.id;
  if (!paymentId) return NextResponse.json({ received: true });
  try {
    const p = await getPayment(mode.cfg, paymentId);
    if (isPaidStatus(p.status, p.billingType)) await applyPaymentRef(p.externalReference, p.id);
  } catch (e) {
    console.error("[webhook asaas]", e);
    return NextResponse.json({ error: "falha temporária" }, { status: 500 }); // o Asaas tenta de novo
  }
  return NextResponse.json({ received: true });
}
