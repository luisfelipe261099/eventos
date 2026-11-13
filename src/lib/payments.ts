/**
 * Pagamentos Pix via Asaas.
 *
 * Cada casa usa a PRÓPRIA chave de API do Asaas: o Pix cai direto na conta dela,
 * na hora. A taxa da Casa Cheia sai de cada cobrança pelo split (valor fixo) para a
 * carteira da plataforma (ASAAS_SPLIT_WALLET_ID).
 * - Chave $aact_hmlg_... → Sandbox (testes) | $aact_prod_... → Produção
 * - Modo demo (sem banco) ou PAYMENTS_TEST_MODE=1: pagamentos aprovados na hora.
 *
 * Fluxo: cliente no Asaas (exige CPF) → cobrança PIX → QR Code (imagem +
 * copia e cola) → webhook PAYMENT_RECEIVED confirma. Como reforço, o status
 * também é consultado direto na API enquanto o cliente espera na tela.
 */
const UA = "CasaCheia/1.0 (Next.js)";

/** Credencial de uma conta Asaas (a da casa, ou a da Casa Cheia para as mensalidades). */
export interface AsaasCfg { apiKey: string }

export const isSandboxKey = (key: string) => process.env.ASAAS_ENV === "sandbox" || key.startsWith("$aact_hmlg_");
const baseUrl = (cfg: AsaasCfg) => process.env.ASAAS_BASE_URL || (isSandboxKey(cfg.apiKey) ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3"); // ASAAS_BASE_URL só para testes
/** Aprovação automática sem cobrar: só fora de produção. */
export const testPayments = () => process.env.PAYMENTS_TEST_MODE === "1";

export class PaymentError extends Error {}

export async function asaas<T>(cfg: AsaasCfg, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${baseUrl(cfg)}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", "User-Agent": UA, access_token: cfg.apiKey },
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
export const todayBR = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);

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

export async function ensureCustomer(cfg: AsaasCfg, p: Payer): Promise<string> {
  if (p.asaasId) return p.asaasId;
  const cpf = (p.cpf ?? "").replace(/\D/g, "");
  if (!cpf) throw new PaymentError("Informe o CPF ou CNPJ.");
  const found = await asaas<{ data: { id: string }[] }>(cfg, `/customers?cpfCnpj=${cpf}&limit=1`);
  if (found.data?.[0]?.id) return found.data[0].id;
  const phone = (p.phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const created = await asaas<{ id: string }>(cfg, "/customers", {
    method: "POST",
    body: { name: p.name, cpfCnpj: cpf, mobilePhone: phone.length >= 10 ? phone : undefined, email: p.email || undefined, notificationDisabled: true },
  });
  return created.id;
}

/**
 * Cria a cobrança Pix na conta da casa. `cfg` nulo = sem Asaas: aprova na hora
 * (quem chama só passa nulo no modo demo ou de teste).
 * `feeCents` é a taxa da Casa Cheia, repassada pelo split quando a carteira da plataforma está configurada.
 */
export async function createPixCharge(cfg: AsaasCfg | null, input: { amountCents: number; feeCents?: number; description: string; externalRef: string; payer: Payer }): Promise<PixCharge & { feeSplit: boolean }> {
  if (input.amountCents <= 0) return { provider: "teste", paymentId: `free-${input.externalRef}`, status: "approved", feeSplit: false };
  if (!cfg) return { provider: "teste", paymentId: `teste-${input.externalRef}`, status: "approved", feeSplit: false };
  const customer = await ensureCustomer(cfg, input.payer);
  const split = splitFor(input.feeCents ?? 0, input.amountCents);
  const pay = await asaas<{ id: string; status: string }>(cfg, "/payments", {
    method: "POST",
    body: {
      customer, billingType: "PIX", value: input.amountCents / 100, dueDate: todayBR(),
      description: input.description.slice(0, 500), externalReference: input.externalRef,
      ...(split ? { split: [split] } : {}),
    },
  });
  const qr = await asaas<{ encodedImage: string; payload: string; expirationDate: string }>(cfg, `/payments/${pay.id}/pixQrCode`);
  return { provider: "asaas", paymentId: pay.id, status: "pending", qrCode: qr.payload, qrCodeBase64: qr.encodedImage, expiresAt: qr.expirationDate, asaasCustomerId: customer, feeSplit: Boolean(split) };
}

/** Carteira Asaas da Casa Cheia, para onde vai a taxa de cada ingresso. */
export const platformWallet = () => process.env.ASAAS_SPLIT_WALLET_ID || "";
/**
 * Reserva para a tarifa do Asaas por Pix recebido (R$ 0,79 a R$ 1,99 conforme a conta).
 * O Asaas calcula o split sobre o valor LÍQUIDO; se o split passar do líquido, o
 * pagamento fica bloqueado. Por isso, em cobrança barata o split não é enviado.
 */
export const ASAAS_PIX_FEE_RESERVE_CENTS = 200;

/** Split de valor fixo: a taxa da Casa Cheia daquela venda. Sem carteira configurada (ou cobrança barata demais), a taxa fica registrada para faturar depois. */
export function splitFor(feeCents: number, amountCents = Number.POSITIVE_INFINITY): { walletId: string; fixedValue: number } | null {
  const walletId = platformWallet();
  if (!walletId || feeCents <= 0) return null;
  if (feeCents > amountCents - ASAAS_PIX_FEE_RESERVE_CENTS) return null;
  return { walletId, fixedValue: feeCents / 100 };
}

/** Apaga uma cobrança ainda não paga, para o QR Code deixar de valer. */
export async function cancelCharge(cfg: AsaasCfg, paymentId: string) {
  await asaas(cfg, `/payments/${paymentId}`, { method: "DELETE" });
}

/** Estorna um Pix recebido (devolve o valor ao cliente). */
export async function refundPayment(cfg: AsaasCfg | null, paymentId: string, description = "Estorno solicitado pela casa") {
  if (!cfg || !paymentId || /^(teste|free)-/.test(paymentId)) return { refunded: true, simulated: true };
  await asaas(cfg, `/payments/${paymentId}/refund`, { method: "POST", body: { description } });
  return { refunded: true, simulated: false };
}

/** Pix só conta como pago quando RECEBIDO (CONFIRMED em Pix pode ser bloqueio cautelar). */
export const isPaidStatus = (status: string, billingType = "PIX") =>
  status === "RECEIVED" || status === "RECEIVED_IN_CASH" || (billingType !== "PIX" && status === "CONFIRMED");

export async function getPayment(cfg: AsaasCfg, paymentId: string) {
  return asaas<{ id: string; status: string; billingType: string; externalReference: string | null; value: number; invoiceUrl?: string; dueDate?: string }>(cfg, `/payments/${paymentId}`);
}

/** Token do webhook derivado da chave de API: não precisa de variável extra. */
export async function webhookToken(cfg: AsaasCfg): Promise<string> {
  const data = new TextEncoder().encode(`vipflow-webhook:${cfg.apiKey}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cadastra (ou reaproveita) o webhook de pagamentos na conta Asaas da casa. */
export async function ensureWebhook(cfg: AsaasCfg, appUrl: string, email: string, venueId: string) {
  const url = `${appUrl.replace(/\/$/, "")}/api/payments/webhook?v=${encodeURIComponent(venueId)}`;
  const list = await asaas<{ data: { id: string; url: string }[] }>(cfg, "/webhooks?limit=100").catch(() => ({ data: [] }));
  const body = {
    name: "Casa Cheia", url, email, enabled: true, interrupted: false, apiVersion: 3, sendType: "SEQUENTIALLY",
    authToken: await webhookToken(cfg), events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED", "PAYMENT_DELETED"],
  };
  const existing = list.data?.find((w) => w.url === url);
  if (existing) await asaas(cfg, `/webhooks/${existing.id}`, { method: "PUT", body });
  else await asaas(cfg, "/webhooks", { method: "POST", body });
  return { url, updated: Boolean(existing) };
}
