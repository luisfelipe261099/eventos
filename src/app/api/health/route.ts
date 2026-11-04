import { NextResponse } from "next/server";
import { isSupabaseConfigured, pg, postgresUrl } from "@/lib/db";
import { paymentsEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Monitoramento: responde 200 se o app e o banco estão de pé. */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "erro" | "demo" = "demo";
  if (postgresUrl()) { try { await pg()`select 1`; database = "ok"; } catch { database = "erro"; } }
  const body = { ok: database !== "erro", mode: isSupabaseConfigured() ? "producao" : "demo", database, payments: paymentsEnabled() ? "asaas" : "teste", ms: Date.now() - started, at: new Date().toISOString() };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
