/**
 * Conta Asaas da plataforma: conferida e corrigida sozinha (sem passo manual).
 * - aviso de pagamentos e repasses (webhook ?v=plataforma) cadastrado e ligado;
 * - chave Pix na conta (sem ela o Asaas não gera QR Code de cobrança): cria uma aleatória se faltar.
 * Roda ao abrir a área de administração e na rotina diária; o resultado fica em cache por 10 minutos.
 */
import { asaas, ensureWebhook, platformCfg, PLATFORM_HOOK, withdrawalToken } from "./payments";

export interface PlatformHealth {
  configured: boolean;
  account?: { name: string; general: string; bankAccount: string; documentation: string };
  pixKeys: number;
  webhook: boolean;
  fixes: string[];
  saqueUrl: string;
  saqueToken: string;
  error?: string;
  checkedAt: string;
}

const g = globalThis as unknown as { __ccHealth?: { at: number; v: PlatformHealth } };
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

export async function ensurePlatformReady(force = false): Promise<PlatformHealth> {
  if (!force && g.__ccHealth && Date.now() - g.__ccHealth.at < 10 * 60 * 1000) return g.__ccHealth.v;
  const cfg = platformCfg();
  const base: PlatformHealth = { configured: Boolean(cfg), pixKeys: 0, webhook: false, fixes: [], saqueUrl: `${appUrl()}/api/payments/saque`, saqueToken: "", checkedAt: new Date().toISOString() };
  if (!cfg) return base;
  try {
    base.saqueToken = await withdrawalToken(cfg);
    const [acc, st] = await Promise.all([
      asaas<{ name?: string; email?: string }>(cfg, "/myAccount"),
      asaas<{ general: string; bankAccountInfo: string; documentation: string }>(cfg, "/myAccount/status/"),
    ]);
    base.account = { name: acc.name ?? "", general: st.general, bankAccount: st.bankAccountInfo, documentation: st.documentation };
    const keys = await asaas<{ totalCount?: number; data?: { status: string }[] }>(cfg, "/pix/addressKeys?limit=10");
    base.pixKeys = (keys.data ?? []).filter((k) => k.status === "ACTIVE").length;
    if (base.pixKeys === 0 && st.general === "APPROVED") {
      await asaas(cfg, "/pix/addressKeys", { method: "POST", body: { type: "EVP" } });
      base.pixKeys = 1; base.fixes.push("Chave Pix aleatória criada na conta da plataforma.");
    }
    const url = `${appUrl()}/api/payments/webhook?v=${PLATFORM_HOOK}`;
    const hooks = await asaas<{ data?: { url: string; enabled: boolean; interrupted?: boolean }[] }>(cfg, "/webhooks?limit=20");
    const hook = (hooks.data ?? []).find((w) => w.url === url);
    if (!hook || !hook.enabled || hook.interrupted) {
      await ensureWebhook(cfg, appUrl(), acc.email || "contato@casacheia.app", PLATFORM_HOOK, ["TRANSFER_DONE", "TRANSFER_FAILED", "TRANSFER_CANCELLED", "TRANSFER_PENDING", "TRANSFER_IN_BANK_PROCESSING"]);
      base.fixes.push(hook ? "Aviso de pagamentos religado." : "Aviso de pagamentos cadastrado.");
    }
    base.webhook = true;
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e);
  }
  g.__ccHealth = { at: Date.now(), v: base };
  return base;
}
