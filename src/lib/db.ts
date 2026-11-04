/**
 * Camada de acesso a dados.
 * - Com Supabase configurado → usa o Postgres do Supabase.
 * - Sem configuração → MODO DEMO, com dados de exemplo em memória
 *   (ótimo para apresentar; os dados reiniciam a cada deploy/cold start).
 *
 * Toda a regra de negócio (repo.ts) fala só com esta interface,
 * então trocar de banco no futuro não mexe no resto do app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDemoData, type DemoData } from "./demo";

export type TableName = keyof DemoData;
type Row = { id: string };

export interface DB {
  mode: "supabase" | "demo";
  select<T extends Row>(table: TableName, match?: Partial<T>): Promise<T[]>;
  get<T extends Row>(table: TableName, id: string): Promise<T | null>;
  insert<T extends Row>(table: TableName, rows: T | T[]): Promise<T[]>;
  update<T extends Row>(table: TableName, id: string, patch: Partial<T>): Promise<T | null>;
}

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------------- Supabase ----------------
let sb: SupabaseClient | null = null;
function supa(): SupabaseClient {
  if (!sb) {
    sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return sb;
}

const supabaseDB: DB = {
  mode: "supabase",
  async select(table, match) {
    let q = supa().from(table).select("*");
    for (const [k, v] of Object.entries(match ?? {})) q = q.eq(k, v as never);
    const { data, error } = await q.limit(10000);
    if (error) throw error;
    return (data ?? []) as never;
  },
  async get(table, id) {
    const { data, error } = await supa().from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data ?? null) as never;
  },
  async insert(table, rows) {
    const { data, error } = await supa().from(table).insert(rows as never).select("*");
    if (error) throw error;
    return (data ?? []) as never;
  },
  async update(table, id, patch) {
    const { data, error } = await supa().from(table).update(patch as never).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return (data ?? null) as never;
  },
};

// ---------------- Demo (memória) ----------------
const g = globalThis as unknown as { __vipflowDemo?: DemoData };
function demo(): DemoData {
  if (!g.__vipflowDemo) g.__vipflowDemo = buildDemoData();
  return g.__vipflowDemo;
}

const demoDB: DB = {
  mode: "demo",
  async select(table, match) {
    const rows = demo()[table] as unknown as Row[];
    const m = Object.entries(match ?? {});
    return rows.filter((r) => m.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v)) as never;
  },
  async get(table, id) {
    return ((demo()[table] as unknown as Row[]).find((r) => r.id === id) ?? null) as never;
  },
  async insert(table, rows) {
    const arr = Array.isArray(rows) ? rows : [rows];
    (demo()[table] as unknown as Row[]).push(...arr);
    return arr as never;
  },
  async update(table, id, patch) {
    const row = (demo()[table] as unknown as Row[]).find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row as never;
  },
};

export function db(): DB {
  return isSupabaseConfigured() ? supabaseDB : demoDB;
}

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
