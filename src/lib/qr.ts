/**
 * QR code dinâmico, validável OFFLINE.
 *
 * Cada ingresso tem uma semente secreta (qr_seed). O celular do cliente gera,
 * a cada 30 s, um código = HMAC-SHA256(semente, ticketId.janela).
 * A portaria baixa antes do evento a lista {ticketId, semente} e valida
 * localmente, sem internet, em milissegundos. Print de tela expira em ~1 min.
 *
 * Usa apenas Web Crypto → funciona igual no navegador, no Node e na Edge.
 */
export const QR_WINDOW_S = 30;
const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(seed: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(seed), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg))).slice(0, 16);
}

export const currentWindow = (now = Date.now()) => Math.floor(now / 1000 / QR_WINDOW_S);
export const secondsLeft = (now = Date.now()) => QR_WINDOW_S - (Math.floor(now / 1000) % QR_WINDOW_S);

export async function makeQrPayload(ticketId: string, seed: string, now = Date.now()): Promise<string> {
  const w = currentWindow(now);
  return `VF1.${ticketId}.${w}.${await hmac(seed, `${ticketId}.${w}`)}`;
}

export type QrCheck =
  | { ok: true; ticketId: string }
  | { ok: false; reason: "formato" | "desconhecido" | "expirado" | "assinatura"; ticketId?: string };

/** Valida um código lido na porta. `seeds` = mapa ticketId → semente (baixado antes). */
export async function verifyQrPayload(payload: string, seeds: Map<string, string>, now = Date.now()): Promise<QrCheck> {
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "VF1") return { ok: false, reason: "formato" };
  const [, ticketId, wStr, sig] = parts;
  const seed = seeds.get(ticketId);
  if (!seed) return { ok: false, reason: "desconhecido", ticketId };
  const w = Number(wStr);
  const cw = currentWindow(now);
  if (!Number.isFinite(w) || Math.abs(cw - w) > 2) return { ok: false, reason: "expirado", ticketId };
  if ((await hmac(seed, `${ticketId}.${w}`)) !== sig) return { ok: false, reason: "assinatura", ticketId };
  return { ok: true, ticketId };
}
