import { pg, postgresUrl } from "./db";

/** Contador de tentativas por chave (IP), no banco quando há Postgres e em memória no modo demo. */
const mem = new Map<string, number[]>();

export async function attempts(key: string, windowMin: number): Promise<number> {
  if (postgresUrl()) {
    const [r] = await pg()`select count(*)::int as n from login_attempts where ip = ${key} and at > now() - make_interval(mins => ${windowMin})`.catch(() => [{ n: 0 }]);
    return r?.n ?? 0;
  }
  const now = Date.now(); const list = (mem.get(key) ?? []).filter((t) => now - t < windowMin * 60_000); mem.set(key, list); return list.length;
}
export async function registerAttempt(key: string) {
  if (postgresUrl()) await pg()`insert into login_attempts (ip) values (${key})`.catch(() => {});
  else mem.set(key, [...(mem.get(key) ?? []), Date.now()]);
}
export async function clearAttempts(key: string) {
  if (postgresUrl()) await pg()`delete from login_attempts where ip = ${key} or at < now() - interval '1 day'`.catch(() => {});
  else mem.delete(key);
}
