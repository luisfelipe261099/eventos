/**
 * Configuração em 1 clique: aplica as migrações SQL direto no Postgres do
 * Supabase (conexão POSTGRES_URL que a integração da Vercel injeta).
 * Cada migração roda uma única vez (tabela _vipflow_migrations).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { hasSupabaseStorage, isSupabaseConfigured, pg, postgresUrl, supabaseUrl } from "./db";

/** Migrações esperadas (mantenha igual aos arquivos de supabase/migrations; há teste garantindo). */
export const MIGRATIONS = ["0001_init.sql", "0002_vitrine.sql", "0003_operacao.sql", "0004_asaas.sql", "0005_midia_seguranca.sql"];

export const dbUrl = () => process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
void postgresUrl;

export async function runMigrations() {
  const url = dbUrl();
  if (!url) throw new Error("Falta a variável POSTGRES_URL (conecte o Supabase pela aba Storage da Vercel).");
  const local = /localhost|127\.0\.0\.1|\/tmp\//.test(url);
  const sql = postgres(url, { ssl: local ? false : "require", max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
  try {
    await sql`create table if not exists _vipflow_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const done = new Set((await sql<{ name: string }[]>`select name from _vipflow_migrations`).map((r) => r.name));
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied: string[] = [];
    for (const f of files) {
      if (done.has(f)) continue;
      const content = await readFile(path.join(dir, f), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into _vipflow_migrations (name) values (${f})`;
      });
      applied.push(f);
    }
    // avisa a API do Supabase (PostgREST) para enxergar as tabelas novas
    await sql`notify pgrst, 'reload schema'`.catch(() => {});
    return { applied, total: files.length };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export interface SetupStatus {
  mode: "demo" | "supabase";
  supabase: boolean;
  dbUrl: boolean;
  tables: boolean;
  venue: boolean;
  adminPassword: boolean;
  cronSecret: boolean;
  appUrl: string;
  payments: boolean;
  paymentsSandbox: boolean;
  split: boolean;
  ai: boolean;
  whatsapp: boolean;
  supabaseHost: string;
  storage: boolean;
}

export async function setupStatus(): Promise<SetupStatus> {
  const supa = isSupabaseConfigured();
  let tables = false, venue = false;
  if (supa && postgresUrl()) {
    try {
      const sql = pg();
      const [t] = await sql`select to_regclass('public.venues') is not null as ok, to_regclass('public._vipflow_migrations') is not null as m`;
      tables = t.ok && t.m;
      if (t.ok) { const [v] = await sql`select count(*)::int as n from venues`; venue = v.n > 0; }
      if (tables) { const done = (await sql<{ name: string }[]>`select name from _vipflow_migrations`).map((r) => r.name); tables = MIGRATIONS.every((m) => done.includes(m)); }
    } catch { tables = false; }
  } else if (supa) {
    try {
      const { supabaseAdmin } = await import("./db");
      const { data, error } = await supabaseAdmin().from("venues").select("id").limit(1);
      tables = !error; venue = !error && (data?.length ?? 0) > 0;
    } catch { tables = false; }
  }
  return {
    mode: supa ? "supabase" : "demo",
    supabase: supa,
    dbUrl: Boolean(dbUrl()),
    tables, venue,
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
    cronSecret: Boolean(process.env.CRON_SECRET),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    payments: Boolean(process.env.ASAAS_API_KEY),
    split: Boolean(process.env.ASAAS_SPLIT_WALLET_ID),
    paymentsSandbox: (process.env.ASAAS_API_KEY ?? "").startsWith("$aact_hmlg_") || process.env.ASAAS_ENV === "sandbox",
    ai: Boolean(process.env.GEMINI_API_KEY),
    whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
    supabaseHost: supabaseUrl().replace(/^https?:\/\//, "").split(".")[0] || (postgresUrl().match(/@([^:/]+)/)?.[1] ?? ""),
    storage: hasSupabaseStorage(),
  };
}
