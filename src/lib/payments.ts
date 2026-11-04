/**
 * Pagamentos Pix via Asaas.
 *
 * O dinheiro cai direto na conta Asaas DA CASA (a chave de API é dela).
 * - Chave $aact_hmlg_... → Sandbox (testes) | $aact_prod_... → Produção
 * - Sem ASAAS_API_KEY → modo teste: pagamentos aprovados na hora.
 *
 * Fluxo: cliente no Asaas (exige CPF) → cobrança PIX → QR Code (imagem +
 * copia e cola) → webhook PAYMENT_RECEIVED confirma. Como reforço, o status
 * também é consultado direto na API enquanto o cliente espera na tela.
 */
const UA = "VipFlow/1.0 (Next.js)";

export const paymentsEnabled = () => Boolean(process.env.ASAAS_API_KEY);
export const asaasSandbox = () => process.env.ASAAS_ENV === "sandbox" || (process.env.ASAAS_API_KEY ?? "").startsWith("$aact_hmlg_");
const baseUrl = () => process.env.ASAAS_BASE_URL || (asaasSandbox() ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3"); // ASAAS_BASE_URL só para testes

export class PaymentError extends Error {}

async function asaas<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", "User-Agent": UA, access_token: process.env.ASAAS_API_KEY ?? "" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description ?? `Asaas respondeu ${res.status}`;
    console.error("[asaas]", path, res.status, JSON.stringify(json).slice(0, 500));
    throw new PaymentError(msg);
  }
  return json as T;
}

/** Data de hoje no fuso de Brasília (vencimento da cobrança Pix). */
const todayBR = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);

export interface PixCharge {
  provider: "asaas" | "teste";
  paymentId: string;
  status: "pending" | "approved";
  qrCode?: string; // copia e cola
  qrCodeBase64?: string; // imagem PNG
  expiresAt?: string;
  asaasCustomerId?: string;
}

export interface Payer { name: string; cpf?: string | null; phone?: string | null; email?: string | null; asaasId?: string | null }

async function ensureCustomer(p: Payer): Promise<string> {
  if (p.asaasId) return p.asaasId;
  const cpf = (p.cpf ?? "").replace(/\D/g, "");
  if (!cpf) throw new PaymentError("Informe o CPF para pagar com Pix.");
  const found = await asaas<{ data: { id: string }[] }>(`/customers?cpfCnpj=${cpf}&limit=1`);
  if (found.data?.[0]?.id) return found.data[0].id;
  const phone = (p.phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const created = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: { name: p.name, cpfCnpj: cpf, mobilePhone: phone.length >= 10 ? phone : undefined, email: p.email || undefined, notificationDisabled: true },
  });
  return created.id;
}

export async function createPixCharge(input: { amountCents: number; description: string; externalRef: string; payer: Payer }): Promise<PixCharge> {
  if (input.amountCents <= 0) return { provider: "teste", paymentId: `free-${input.externalRef}`, status: "approved" };
  if (!paymentsEnabled()) return { provider: "teste", paymentId: `teste-${input.externalRef}`, status: "approved" };
  const customer = await ensureCustomer(input.payer);
  const pay = await asaas<{ id: string; status: string }>("/payments", {
    method: "POST",
    body: {
      customer, billingType: "PIX", value: input.amountCents / 100, dueDate: todayBR(),
      description: input.description.slice(0, 500), externalReference: input.externalRef,
    },
  });
  const qr = await asaas<{ encodedImage: string; payload: string; expirationDate: string }>(`/payments/${pay.id}/pixQrCode`);
  return { provider: "asaas", paymentId: pay.id, status: "pending", qrCode: qr.payload, qrCodeBase64: qr.encodedImage, expiresAt: qr.expirationDate, asaasCustomerId: customer };
}

/** Pix só conta como pago quando RECEBIDO (CONFIRMED em Pix pode ser bloqueio cautelar). */
export const isPaidStatus = (status: string, billingType = "PIX") =>
  status === "RECEIVED" || status === "RECEIVED_IN_CASH" || (billingType !== "PIX" && status === "CONFIRMED");

export async function getPayment(paymentId: string) {
  return asaas<{ id: string; status: string; billingType: string; externalReference: string | null; value: number }>(`/payments/${paymentId}`);
}

/** Token do webhook derivado da chave de API: não precisa de variável extra. */
export async function webhookToken(): Promise<string> {
  const data = new TextEncoder().encode(`vipflow-webhook:${process.env.ASAAS_API_KEY ?? ""}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cadastra (ou reaproveita) o webhook de pagamentos na conta Asaas da casa. */
export async function ensureWebhook(appUrl: string, email: string) {
  const url = `${appUrl.replace(/\/$/, "")}/api/payments/webhook`;
  const list = await asaas<{ data: { id: string; url: string }[] }>("/webhooks?limit=100").catch(() => ({ data: [] }));
  const body = {
    name: "VipFlow", url, email, enabled: true, interrupted: false, apiVersion: 3, sendType: "SEQUENTIALLY",
    authToken: await webhookToken(), events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED", "PAYMENT_DELETED"],
  };
  const existing = list.data?.find((w) => w.url === url);
  if (existing) await asaas(`/webhooks/${existing.id}`, { method: "PUT", body });
  else await asaas("/webhooks", { method: "POST", body });
  return { url, updated: Boolean(existing) };
}
