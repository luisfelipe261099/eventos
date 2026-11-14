import { NextResponse } from "next/server";
import { body, fail, handle, ok } from "@/lib/http";
import { randomBytes } from "node:crypto";
import { hashPassword, isRoot, sessionCookie } from "@/lib/admin-auth";
import { db, pg, postgresUrl } from "@/lib/db";
import { getVenueById } from "@/lib/repo";
import { PLANS } from "@/lib/plans";
import { ensureWebhook, PaymentError, platformCfg, PLATFORM_HOOK, withdrawalToken } from "@/lib/payments";
import type { EventItem, Ticket, Venue } from "@/lib/types";

const STATUS = ["trial", "active", "past_due", "blocked"] as const;

/** Ações da Casa Cheia sobre uma casa: abrir o painel dela, trocar plano ou situação, estender o período grátis. */
export const POST = handle(async (req: Request) => {
  if (!(await isRoot())) return fail("Não autorizado", 401);
  const b = await body<{ venueId: string; action: "enter" | "plan" | "status" | "extend" | "reset_password" | "delete" | "setup_hooks"; plan?: string; status?: string; days?: number; email?: string }>(req);
  if (b.action === "setup_hooks") {
    // webhook da conta da plataforma (vendas das casas, mensalidades e repasses) + dados da validação de saque
    const cfg = platformCfg();
    if (!cfg) return fail("Cadastre VIPFLOW_ASAAS_API_KEY (chave da conta Asaas da plataforma) na Vercel.");
    if (!b.email?.includes("@")) return fail("Informe um e-mail para o Asaas avisar se algo falhar.");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
    try {
      const hook = await ensureWebhook(cfg, appUrl, b.email, PLATFORM_HOOK, ["TRANSFER_DONE", "TRANSFER_FAILED", "TRANSFER_CANCELLED", "TRANSFER_PENDING", "TRANSFER_IN_BANK_PROCESSING"]);
      return ok({ webhook: hook.url, saqueUrl: `${appUrl}/api/payments/saque`, saqueToken: await withdrawalToken(cfg) });
    } catch (e) {
      if (e instanceof PaymentError) return fail(`O Asaas recusou: ${e.message}`, 502);
      throw e;
    }
  }
  const v = b.venueId ? await getVenueById(b.venueId) : null;
  if (!v) return fail("Casa não encontrada.", 404);
  if (b.action === "enter") {
    const res = NextResponse.json({ ok: true });
    const c = sessionCookie({ venueId: v.id, root: true });
    res.cookies.set(c.name, c.value, c.options);
    return res;
  }
  if (b.action === "plan") {
    if (!PLANS.some((p) => p.id === b.plan)) return fail("Plano inválido.");
    return ok(await db().update<Venue>("venues", v.id, { plan: b.plan }).then(() => ({ plan: b.plan })));
  }
  if (b.action === "status") {
    if (!STATUS.includes(b.status as (typeof STATUS)[number])) return fail("Situação inválida.");
    await db().update<Venue>("venues", v.id, { plan_status: b.status as Venue["plan_status"] });
    return ok({ status: b.status });
  }
  if (b.action === "extend") {
    const days = Math.min(365, Math.max(1, Math.round(Number(b.days) || 30)));
    const from = Math.max(Date.now(), v.trial_ends_at ? new Date(v.trial_ends_at).getTime() : 0);
    const trial_ends_at = new Date(from + days * 864e5).toISOString();
    await db().update<Venue>("venues", v.id, { trial_ends_at, plan_status: "trial" });
    return ok({ trial_ends_at });
  }
  if (b.action === "reset_password") {
    // a casa esqueceu a senha: a Casa Cheia gera uma provisória e passa pelo WhatsApp
    if (!v.owner_email) return fail("Esta casa não tem conta própria (sem e-mail de login).");
    const password = randomBytes(9).toString("base64url");
    await db().update<Venue>("venues", v.id, { password_hash: hashPassword(password) });
    return ok({ email: v.owner_email, password });
  }
  if (b.action === "delete") {
    // só para cadastros de teste ou abandonados: casa que já emitiu ingresso não é apagada
    const events = await db().select<EventItem>("events", { venue_id: v.id });
    const ids = new Set(events.map((e) => e.id));
    const tickets = (await db().select<Ticket>("tickets")).filter((t) => ids.has(t.event_id)).length;
    if (tickets > 0) return fail(`Esta casa já emitiu ${tickets} ingresso(s). Pause a casa em vez de excluir.`, 409);
    if (!postgresUrl()) return fail("Exclusão disponível só com o banco conectado.", 409);
    await pg()`delete from venues where id = ${v.id}`; // eventos, lotes, produtos e promoters saem em cascata
    return ok({ deleted: true });
  }
  return fail("Ação inválida.");
});
