import { guardAdmin, handle, ok } from "@/lib/http";
import { runMigrations, setupStatus } from "@/lib/setup";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = handle(async () => ok(await setupStatus()));

/** Cria/atualiza as tabelas no Supabase. */
export const POST = handle(async () => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok({ ...(await runMigrations()), status: await setupStatus() });
});
