/**
 * Pix via Mercado Pago (sem mensalidade; cobra taxa por transação).
 * O dinheiro cai na conta Mercado Pago DA CASA (o access token é dela),
 * então a VipFlow não retém valores. Para cobrar comissão da plataforma no
 * futuro, use o modelo "marketplace" do MP com application_fee (split).
 *
 * Sem MP_ACCESS_TOKEN → modo demo: o pagamento é aprovado na hora.
 */
export const paymentsEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN);

export interface PixCharge {
  provider: "mercadopago" | "demo";
  paymentId: string;
  status: "pending" | "approved";
  qrCode?: string; // copia e cola
  qrCodeBase64?: string; // imagem PNG
}

export async function createPixCharge(input: { amountCents: number; description: string; externalRef: string; payerEmail?: string }): Promise<PixCharge> {
  if (!paymentsEnabled() || input.amountCents === 0) {
    return { provider: "demo", paymentId: `demo-${input.externalRef}`, status: "approved" };
  }
  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.externalRef,
    },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalRef,
      notification_url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook` : undefined,
      payer: { email: input.payerEmail || "cliente@vipflow.app" },
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago: ${res.status} ${await res.text()}`);
  const p = await res.json();
  return {
    provider: "mercadopago",
    paymentId: String(p.id),
    status: p.status === "approved" ? "approved" : "pending",
    qrCode: p.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: p.point_of_interaction?.transaction_data?.qr_code_base64,
  };
}

export async function getPayment(paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Mercado Pago: ${res.status}`);
  return (await res.json()) as { status: string; external_reference: string };
}
