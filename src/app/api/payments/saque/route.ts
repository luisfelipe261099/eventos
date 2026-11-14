import { NextResponse } from "next/server";
import { platformCfg, withdrawalToken } from "@/lib/payments";
import { validateWithdrawal } from "@/lib/payouts";

/**
 * Validação de saque do Asaas (conta da plataforma → Integrações → Mecanismos de segurança).
 * O Asaas pergunta antes de cada transferência pedida pela API; só aprovamos os repasses
 * registrados pela Casa Cheia. Se alguém usar a chave de API para sacar, é recusado.
 */
export async function POST(req: Request) {
  const cfg = platformCfg();
  if (!cfg) return NextResponse.json({ status: "REFUSED", refuseReason: "Plataforma sem conta configurada." });
  if (req.headers.get("asaas-access-token") !== (await withdrawalToken(cfg))) {
    return NextResponse.json({ status: "REFUSED", refuseReason: "Token de validação inválido." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const res = await validateWithdrawal(body);
  if (res.status === "REFUSED") console.warn("[validação de saque] recusado:", JSON.stringify(body).slice(0, 400));
  return NextResponse.json(res);
}
