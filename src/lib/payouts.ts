/**
 * Recebimento pela conta da plataforma.
 *
 * Quando a casa não liga uma conta Asaas própria, o Pix das vendas cai na conta Asaas
 * da Casa Cheia. Cada pagamento confirmado credita a casa no extrato (ledger) com o
 * valor líquido: o que o cliente pagou, menos a tarifa do Asaas e a taxa da plataforma.
 * O saldo é repassado por Pix para a chave que a casa cadastrou: sozinho uma vez por
 * dia, ou na hora pelo botão "Receber agora".
 *
 * Segurança do repasse: no Asaas, em Integrações → Mecanismos de segurança, a URL de
 * validação de saque aponta para /api/payments/saque. O Asaas pergunta antes de cada
 * transferência pedida pela API, e só aprovamos as que estão registradas aqui.
 */
import { db, uid } from "./db";
import { createPixTransfer, getTransfer, PaymentError, platformCfg, type AsaasPayment, type AsaasTransfer } from "./payments";
import { isValidCpf } from "./format";
import type { EventItem, LedgerEntry, Payout, PixKeyType, Tab, Ticket, Venue } from "./types";

export const MIN_PAYOUT_CENTS = 500;
const OPEN: Payout["status"][] = ["requested", "awaiting_authorization", "pending"];
const COUNTS: Payout["status"][] = [...OPEN, "done"];

const cents = (v: number | undefined | null) => Math.round((v ?? 0) * 100);

// ---------------------------------------------------------------- chave Pix
export const PIX_TYPES: { id: PixKeyType; label: string }[] = [
  { id: "CNPJ", label: "CNPJ" }, { id: "CPF", label: "CPF" }, { id: "EMAIL", label: "E-mail" }, { id: "PHONE", label: "Celular" }, { id: "EVP", label: "Chave aleatória" },
];

function isValidCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n: number) => { const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Confere e normaliza a chave Pix como o Asaas espera. Devolve null se não for válida. */
export function normalizePixKey(type: string, key: string): { type: PixKeyType; key: string } | null {
  const k = (key ?? "").trim();
  switch (type) {
    case "CPF": { const d = k.replace(/\D/g, ""); return isValidCpf(d) ? { type, key: d } : null; }
    case "CNPJ": { const d = k.replace(/\D/g, ""); return isValidCnpj(d) ? { type, key: d } : null; }
    case "EMAIL": return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k) ? { type, key: k.toLowerCase() } : null;
    case "PHONE": { let d = k.replace(/\D/g, ""); if (d.length === 10 || d.length === 11) d = "55" + d; return /^55\d{10,11}$/.test(d) ? { type, key: "+" + d } : null; }
    case "EVP": return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k) ? { type, key: k.toLowerCase() } : null;
    default: return null;
  }
}

// ---------------------------------------------------------------- extrato
async function addEntry(e: Omit<LedgerEntry, "id" | "created_at">) {
  const [exists] = await db().select<LedgerEntry>("ledger", { kind: e.kind, ref: e.ref });
  if (exists) return exists;
  try {
    const [row] = await db().insert<LedgerEntry>("ledger", { id: uid(), created_at: new Date().toISOString(), ...e });
    return row;
  } catch (err) {
    const [again] = await db().select<LedgerEntry>("ledger", { kind: e.kind, ref: e.ref }); // outro processo gravou no mesmo instante
    if (again) return again;
    throw err;
  }
}

/** Credita a venda no extrato da casa (idempotente pela cobrança). */
export async function creditSale(input: { venueId: string; kind: "ticket" | "tab"; payment: AsaasPayment; platformFeeCents: number; note: string }) {
  const gross = cents(input.payment.value);
  const net = input.payment.netValue != null ? cents(input.payment.netValue) : gross;
  const fee = Math.min(input.platformFeeCents, net);
  return addEntry({
    venue_id: input.venueId, kind: input.kind === "ticket" ? "sale_ticket" : "sale_tab", ref: input.payment.id,
    gross_cents: gross, asaas_fee_cents: gross - net, platform_fee_cents: fee, amount_cents: net - fee, note: input.note,
  });
}

/**
 * Estorno de uma venda já creditada: o cliente recebe tudo de volta, a casa devolve o que
 * pagou pelo cliente menos a taxa da plataforma (que a plataforma devolve), e fica com o
 * custo da tarifa do Asaas, como seria numa conta própria.
 */
export async function debitRefund(paymentId: string) {
  const [sale] = [...(await db().select<LedgerEntry>("ledger", { kind: "sale_ticket", ref: paymentId })), ...(await db().select<LedgerEntry>("ledger", { kind: "sale_tab", ref: paymentId }))];
  if (!sale) return null; // nunca foi creditada: nada a devolver
  return addEntry({
    venue_id: sale.venue_id, kind: "refund", ref: paymentId, gross_cents: -sale.gross_cents, asaas_fee_cents: 0,
    platform_fee_cents: -sale.platform_fee_cents, amount_cents: -(sale.gross_cents - sale.platform_fee_cents), note: "Estorno ao cliente",
  });
}

export async function balance(venueId: string) {
  const [entries, payouts] = await Promise.all([db().select<LedgerEntry>("ledger", { venue_id: venueId }), db().select<Payout>("payouts", { venue_id: venueId })]);
  const credited = entries.reduce((s, e) => s + e.amount_cents, 0);
  const paidOut = payouts.filter((p) => COUNTS.includes(p.status)).reduce((s, p) => s + p.value_cents, 0);
  const inFlight = payouts.filter((p) => OPEN.includes(p.status)).reduce((s, p) => s + p.value_cents, 0);
  return { availableCents: credited - paidOut, inFlightCents: inFlight, entries, payouts };
}

// ---------------------------------------------------------------- repasse
export class PayoutError extends Error {}

const transferStatus = (t: AsaasTransfer): Payout["status"] =>
  t.status === "DONE" ? "done" : t.status === "FAILED" || t.status === "CANCELLED" ? "failed" : t.authorized === false ? "awaiting_authorization" : "pending";

/** Repassa todo o saldo disponível para a chave Pix da casa. */
export async function requestPayout(venueId: string, opts: { auto?: boolean } = {}) {
  const cfg = platformCfg();
  if (!cfg) throw new PayoutError("Repasse indisponível: a conta da plataforma não está configurada.");
  const v = await db().get<Venue>("venues", venueId);
  if (!v?.pix_key || !v.pix_key_type) throw new PayoutError("Cadastre a chave Pix da casa para receber.");
  const { availableCents } = await balance(venueId);
  if (availableCents < MIN_PAYOUT_CENTS) throw new PayoutError(`Saldo abaixo do mínimo de R$ ${(MIN_PAYOUT_CENTS / 100).toFixed(2).replace(".", ",")} para repasse.`);
  const now = new Date().toISOString();
  let payout: Payout;
  try {
    [payout] = await db().insert<Payout>("payouts", {
      id: uid(), venue_id: venueId, value_cents: availableCents, pix_key: v.pix_key, pix_key_type: v.pix_key_type as PixKeyType,
      status: "requested", fee_cents: 0, auto: Boolean(opts.auto), created_at: now, updated_at: now,
    });
  } catch {
    throw new PayoutError("Já existe um repasse em andamento. Aguarde ele terminar.");
  }
  try {
    const t = await createPixTransfer(cfg, { valueCents: availableCents, pixKey: v.pix_key, pixKeyType: v.pix_key_type, description: `Casa Cheia: repasse ${v.name}` });
    return (await db().update<Payout>("payouts", payout.id, { transfer_id: t.id, status: transferStatus(t), fee_cents: cents(t.transferFee), fail_reason: t.failReason ?? null, updated_at: new Date().toISOString() }))!;
  } catch (e) {
    await db().update<Payout>("payouts", payout.id, { status: "failed", fail_reason: e instanceof Error ? e.message.slice(0, 300) : "erro", updated_at: new Date().toISOString() });
    throw e instanceof PaymentError ? new PayoutError(`O Asaas recusou o repasse: ${e.message}`) : e;
  }
}

/** Atualiza o repasse a partir de um evento de transferência do Asaas (webhook ou consulta). */
export async function applyTransfer(t: AsaasTransfer) {
  const [p] = await db().select<Payout>("payouts", { transfer_id: t.id });
  if (!p || p.status === "done" || p.status === "failed") return p ?? null;
  return db().update<Payout>("payouts", p.id, { status: transferStatus(t), fee_cents: cents(t.transferFee) || p.fee_cents, fail_reason: t.failReason ?? null, updated_at: new Date().toISOString() });
}

/**
 * Validação de saque: o Asaas pergunta antes de cada operação de saída pedida pela API.
 * Aprova só repasse registrado aqui (mesmo valor e mesma chave Pix, pedido há poucos minutos)
 * e estorno de Pix ao cliente. Todo o resto é recusado.
 */
export async function validateWithdrawal(body: { type?: string; transfer?: { id?: string; value?: number; bankAccount?: { pixAddressKey?: string } } }) {
  if (body?.type === "PIX_REFUND" || body?.type === "pixRefund") return { status: "APPROVED" as const };
  if (body?.type !== "TRANSFER" || !body.transfer) return { status: "REFUSED" as const, refuseReason: "Operação não reconhecida pela Casa Cheia." };
  const tr = body.transfer;
  const recent = Date.now() - 15 * 60 * 1000;
  const open = (await db().select<Payout>("payouts")).filter((p) => OPEN.includes(p.status) && new Date(p.created_at).getTime() > recent);
  const sameKey = (k?: string) => (k ?? "").replace(/[^\w@.+-]/g, "").toLowerCase();
  const match = open.find((p) => (tr.id && p.transfer_id === tr.id) || (cents(tr.value) === p.value_cents && sameKey(tr.bankAccount?.pixAddressKey) === sameKey(p.pix_key)));
  return match ? { status: "APPROVED" as const } : { status: "REFUSED" as const, refuseReason: "Transferência não registrada pela Casa Cheia." };
}

// ---------------------------------------------------------------- rotina diária
/** Confere repasses em andamento, credita vendas que ficaram sem crédito e faz o repasse automático. */
export async function runPayouts() {
  const cfg = platformCfg();
  if (!cfg) return { manual: true };
  let updated = 0, paid = 0;
  const errors: string[] = [];
  for (const p of (await db().select<Payout>("payouts")).filter((x) => OPEN.includes(x.status) && x.transfer_id)) {
    try { await applyTransfer(await getTransfer(cfg, p.transfer_id!)); updated++; } catch (e) { errors.push(String(e)); }
  }
  for (const v of await db().select<Venue>("venues")) {
    if (!v.pix_key || v.payout_auto === false || v.asaas_key_enc || v.plan_status === "blocked") continue;
    try {
      if ((await balance(v.id)).availableCents >= MIN_PAYOUT_CENTS) { await requestPayout(v.id, { auto: true }); paid++; }
    } catch (e) { errors.push(`${v.name}: ${e instanceof Error ? e.message : e}`); }
  }
  return { manual: false, updated, paid, errors };
}

/** Taxa da plataforma de uma cobrança: ingresso guarda a taxa; comanda não tem. */
export async function platformFeeFor(kind: "ticket" | "tab", refId: string) {
  if (kind === "tab") return 0;
  return (await db().get<Ticket>("tickets", refId))?.fee_cents ?? 0;
}
export async function venueOfRef(kind: "ticket" | "tab", refId: string) {
  const row = kind === "ticket" ? await db().get<Ticket>("tickets", refId) : await db().get<Tab>("tabs", refId);
  return row ? (await db().get<EventItem>("events", row.event_id))?.venue_id ?? null : null;
}
