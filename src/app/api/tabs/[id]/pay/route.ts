import { body, fail, handle, ok } from "@/lib/http";
import { getTab } from "@/lib/repo";
import { createPixCharge, paymentsEnabled, PaymentError } from "@/lib/payments";
import { isValidCpf } from "@/lib/format";
import { db } from "@/lib/db";
import type { Customer, Tab } from "@/lib/types";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { cpf } = await body<{ cpf?: string }>(req);
  const t = await getTab(id);
  if (!t) return fail("Comanda não encontrada", 404);
  if (t.tab.status === "paid") return ok({ pix: { status: "approved" } });
  let customer = await db().get<Customer>("customers", t.tab.customer_id);
  if (!customer) return fail("Cliente da comanda não encontrado", 404);
  if (paymentsEnabled()) {
    if (cpf) {
      if (!isValidCpf(cpf)) return fail("CPF inválido. Confira os números.");
      customer = (await db().update<Customer>("customers", customer.id, { cpf: cpf.replace(/\D/g, ""), asaas_id: null })) ?? customer;
    }
    if (!customer.cpf) return fail("Informe o CPF para pagar com Pix.", 422);
  }
  try {
    const pix = await createPixCharge({
      amountCents: t.total, description: `Comanda ${t.tab.table_label}`, externalRef: `tab:${id}`,
      payer: { name: customer.name, cpf: customer.cpf, phone: customer.phone, email: customer.email, asaasId: customer.asaas_id },
    });
    await db().update<Tab>("tabs", id, { payment_id: pix.paymentId, ...(pix.status === "approved" ? { status: "paid" as const } : {}) });
    if (pix.asaasCustomerId && pix.asaasCustomerId !== customer.asaas_id) await db().update<Customer>("customers", customer.id, { asaas_id: pix.asaasCustomerId });
    return ok({ pix });
  } catch (e) {
    if (e instanceof PaymentError) return fail(`Não foi possível gerar o Pix: ${e.message}`, 502);
    throw e;
  }
});
