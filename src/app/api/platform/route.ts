import { NextResponse } from "next/server";
import { body, fail, handle, ok } from "@/lib/http";
import { randomBytes } from "node:crypto";
import { hashPassword, isRoot, sessionCookie } from "@/lib/admin-auth";
import { db, pg, postgresUrl } from "@/lib/db";
import { getVenueById } from "@/lib/repo";
import { PLANS } from "@/lib/plans";
import type { EventItem, Ticket, Venue } from "@/lib/types";

const STATUS = ["trial", "active", "past_due", "blocked"] as const;

/** Ações da VipFlow sobre uma casa: abrir o painel dela, trocar plano ou situação, estender o período grátis. */
export const POST = handle(async (req: Request) => {
  if (!(await isRoot())) return fail("Não autorizado", 401);
  const b = await body<{ venueId: string; action: "enter" | "plan" | "status" | "extend" | "reset_password" | "delete"; plan?: string; status?: string; days?: number }>(req);
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
    // a casa esqueceu a senha: a VipFlow gera uma provisória e passa pelo WhatsApp
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
