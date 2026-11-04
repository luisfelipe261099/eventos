import { NextResponse } from "next/server";
import { isAdmin } from "./admin-auth";

export const ok = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function body<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}

export async function guardAdmin() {
  return (await isAdmin()) ? null : fail("Não autorizado", 401);
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try { return await fn(...args); }
    catch (e) { console.error(e); return fail(e instanceof Error ? e.message : "Erro inesperado", 500); }
  };
}
