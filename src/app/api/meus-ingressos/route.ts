import { body, fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { isValidCpf } from "@/lib/format";
import { attempts, registerAttempt } from "@/lib/rate-limit";
import type { Customer, Ticket } from "@/lib/types";

/**
 * "Encontre seus ingressos": quem comprou em outro celular recupera os ingressos pagos
 * informando o WhatsApp e o CPF usados no Pix. Os dois precisam bater; limite de tentativas por IP.
 */
export const POST = handle(async (req: Request) => {
  const key = `ingressos:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if ((await attempts(key, 15)) >= 6) return fail("Muitas tentativas. Aguarde 15 minutos.", 429);
  await registerAttempt(key);
  const { phone, cpf } = await body<{ phone?: string; cpf?: string }>(req);
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const doc = (cpf ?? "").replace(/\D/g, "");
  if (digits.length < 10 || !isValidCpf(doc)) return fail("Informe o WhatsApp com DDD e um CPF válido.");
  const customers = (await db().select<Customer>("customers", { cpf: doc })).filter((c) => c.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").endsWith(digits.slice(-10)));
  const ids: string[] = [];
  for (const c of customers) {
    const tks = await db().select<Ticket>("tickets", { customer_id: c.id });
    ids.push(...tks.filter((t) => t.status === "paid" || t.status === "used").map((t) => t.id));
  }
  return ok({ ids: ids.slice(0, 50) });
});
