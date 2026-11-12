import { NextResponse } from "next/server";
import { isSupabaseConfigured, postgresUrl, withDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Monitoramento: responde 200 se o app e o banco estão de pé. */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "erro" | "demo" = "demo";
  if (postgresUrl()) { try { await withDb((sql) => sql`select 1`, true); database = "ok"; } catch { database = "erro"; } }
  const body = { ok: database !== "erro", mode: isSupabaseConfigured() ? "producao" : "demo", database, ms: Date.now() - started, at: new Date().toISOString() };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
