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
import { deflateRawSync, inflateRawSync } from "node:zlib";
import postgres from "postgres";
import { buildDemoData, type DemoData } from "./demo";

export type TableName = keyof DemoData;
type Row = { id: string };

export interface DB {
  mode: "supabase" | "demo";
  /** Reserva 1 ingresso do lote de forma atômica (false = esgotado). */
  reserveTicket(ticketTypeId: string): Promise<boolean>;
  select<T extends Row>(table: TableName, match?: Partial<T>): Promise<T[]>;
  get<T extends Row>(table: TableName, id: string): Promise<T | null>;
  insert<T extends Row>(table: TableName, rows: T | T[]): Promise<T[]>;
  update<T extends Row>(table: TableName, id: string, patch: Partial<T>): Promise<T | null>;
}

/** Aceita os nomes de variável da integração Supabase da Vercel e os manuais. */
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
/** Supabase Storage disponível (upload de flyers). */
export const hasSupabaseStorage = () => Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
/** URL do Postgres (a integração Supabase da Vercel cria POSTGRES_URL). */
export const postgresUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
/**
 * Modo produção: há banco real configurado (Postgres direto ou API do Supabase).
 * Sem nenhum dos dois, o app roda no modo demonstração.
 */
export const isSupabaseConfigured = () => Boolean(postgresUrl()) || hasSupabaseStorage();

// ---------------- Supabase ----------------
let sb: SupabaseClient | null = null;
function supa(): SupabaseClient {
  if (!sb) {
    sb = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return sb;
}

export const supabaseAdmin = () => supa();

// ---------------- Postgres direto (principal em produção) ----------------
type Sql = ReturnType<typeof postgres>;
const gp = globalThis as unknown as { __vfSql?: Sql };
export function pg(): Sql {
  if (!gp.__vfSql) {
    const url = postgresUrl();
    const local = /localhost|127\.0\.0\.1/.test(url);
    gp.__vfSql = postgres(url, {
      ssl: local ? false : "require", max: 3, idle_timeout: 20, connect_timeout: 15,
      prepare: false, // compatível com o pooler do Supabase (porta 6543)
      transform: { undefined: null, value: { from: (v: unknown) => (v instanceof Date ? v.toISOString() : v) } },
      onnotice: () => {},
    });
  }
  return gp.__vfSql;
}

const postgresDB: DB = {
  mode: "supabase",
  async reserveTicket(id) {
    const [r] = await pg()`select reserve_ticket(${id}) as ok`;
    return r?.ok === true;
  },
  async select(table, match) {
    const sql = pg();
    const conds = Object.entries(match ?? {}).map(([k, v]) => sql`${sql(k)} = ${v as never}`);
    const where = conds.length ? conds.reduce((a, c) => sql`${a} and ${c}`) : sql`true`;
    return (await sql`select * from ${sql(table)} where ${where} limit 20000`) as never;
  },
  async get(table, id) {
    const sql = pg();
    const [r] = await sql`select * from ${sql(table)} where id = ${id}`;
    return (r ?? null) as never;
  },
  async insert(table, rows) {
    const sql = pg();
    const arr = (Array.isArray(rows) ? rows : [rows]) as unknown as Record<string, unknown>[];
    if (!arr.length) return [] as never;
    const cols = [...new Set(arr.flatMap((r) => Object.keys(r)))];
    const norm = arr.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] === undefined ? null : r[c]])));
    return (await sql`insert into ${sql(table)} ${sql(norm as never, cols)} returning *`) as never;
  },
  async update(table, id, patch) {
    const sql = pg();
    const p = Object.fromEntries(Object.entries(patch as Record<string, unknown>).filter(([k, v]) => k !== "id" && v !== undefined));
    if (!Object.keys(p).length) return this.get(table, id);
    const [r] = await sql`update ${sql(table)} set ${sql(p as never)} where id = ${id} returning *`;
    return (r ?? null) as never;
  },
};

const supabaseDB: DB = {
  mode: "supabase",
  async reserveTicket(id) {
    const { data, error } = await supa().rpc("reserve_ticket", { p_ticket_type_id: id });
    if (error) throw error;
    return data === true;
  },
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

// ---------------- Demo (simulação por visitante) ----------------
/*
 * Na Vercel cada requisição pode cair num servidor diferente, então a memória
 * não é confiável. No modo demo, as alterações de cada visitante (compras,
 * check-ins, pedidos) são guardadas num cookie do próprio navegador e
 * reaplicadas sobre os dados de exemplo a cada requisição. Assim a simulação
 * funciona em qualquer servidor, sem banco, e cada visitante tem a sua.
 */
export const SIM_COOKIE = "vf_sim";
const SIM_MAX_BYTES = 3800;
type Op = ["i", TableName, Row[]] | ["u", TableName, string, Record<string, unknown>];

const g = globalThis as unknown as { __vfBase?: { at: number; data: DemoData }; __vfCache?: Map<string, { data: DemoData; ops: Op[] }> };
function base(): DemoData {
  // recalcula a base a cada 6h para as datas "da próxima sexta" continuarem corretas
  if (!g.__vfBase || Date.now() - g.__vfBase.at > 6 * 36e5) { g.__vfBase = { at: Date.now(), data: buildDemoData() }; g.__vfCache = new Map(); }
  return g.__vfBase.data;
}

function applyOp(d: DemoData, op: Op) {
  const rows = d[op[1]] as unknown as Row[];
  if (op[0] === "i") rows.push(...op[2].map((r) => ({ ...r })));
  else { const row = rows.find((r) => r.id === op[2]); if (row) Object.assign(row, op[3]); }
}

// JSON comprimido (deflate) em base64url: cabe ~10× mais ações no cookie
const encode = (ops: Op[]) => deflateRawSync(Buffer.from(JSON.stringify(ops))).toString("base64url");
const decode = (raw: string): Op[] => {
  if (!raw) return [];
  try { const v = JSON.parse(inflateRawSync(Buffer.from(raw, "base64url")).toString()); return Array.isArray(v) ? v : []; } catch { return []; }
};

async function readCookie(): Promise<string> {
  try { const { cookies } = await import("next/headers"); return (await cookies()).get(SIM_COOKIE)?.value ?? ""; } catch { return ""; }
}

async function session() {
  const raw = await readCookie();
  base();
  const cache = g.__vfCache!;
  let s = cache.get(raw);
  if (!s) {
    const data = structuredClone(g.__vfBase!.data);
    const ops = decode(raw);
    for (const op of ops) applyOp(data, op);
    s = { data, ops };
    if (cache.size > 200) cache.clear();
    cache.set(raw, s);
  }
  return s;
}

async function persist(s: { data: DemoData; ops: Op[] }, op: Op) {
  s.ops.push(op);
  let raw = encode(s.ops);
  while (raw.length > SIM_MAX_BYTES && s.ops.length > 1) { s.ops.shift(); raw = encode(s.ops); } // simulação longa: descarta as ações mais antigas
  g.__vfCache!.set(raw, s);
  try {
    const { cookies } = await import("next/headers");
    (await cookies()).set(SIM_COOKIE, raw, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 3 });
  } catch { /* fora de uma rota (ex.: renderização): só lê */ }
}

const strip = (r: Row) => Object.fromEntries(Object.entries(r as unknown as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "")) as unknown as Row;

const demoDB: DB = {
  mode: "demo",
  async reserveTicket(id) {
    const tt = await this.get<{ id: string; sold: number; quantity: number }>("ticket_types", id);
    if (!tt || tt.sold >= tt.quantity) return false;
    await this.update<{ id: string; sold: number }>("ticket_types", id, { sold: tt.sold + 1 });
    return true;
  },
  async select(table, match) {
    const rows = (await session()).data[table] as unknown as Row[];
    const m = Object.entries(match ?? {});
    return rows.filter((r) => m.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v)) as never;
  },
  async get(table, id) {
    return (((await session()).data[table] as unknown as Row[]).find((r) => r.id === id) ?? null) as never;
  },
  async insert(table, rows) {
    const s = await session();
    const arr = (Array.isArray(rows) ? rows : [rows]).map(strip);
    (s.data[table] as unknown as Row[]).push(...arr);
    await persist(s, ["i", table, arr]);
    return arr as never;
  },
  async update(table, id, patch) {
    const s = await session();
    const row = (s.data[table] as unknown as Row[]).find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    await persist(s, ["u", table, id, patch as Record<string, unknown>]);
    return row as never;
  },
};

export function db(): DB {
  if (postgresUrl()) return postgresDB;
  if (hasSupabaseStorage()) return supabaseDB;
  return demoDB;
}

/** No Supabase: UUID. Na demo: id curto, para caber no cookie da simulação. */
export const uid = () => {
  if (isSupabaseConfigured()) return crypto.randomUUID();
  const b = new Uint8Array(6); crypto.getRandomValues(b);
  return "s" + Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 9);
};
