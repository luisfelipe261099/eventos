import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, bestPlan, getPlan, marketCostCents, monthlyCostCents, ticketFeeCents, ticketTotals } from "./plans";

test("taxa por ingresso: percentual, piso e ingresso grátis", () => {
  const e = getPlan("essencial");
  assert.equal(ticketFeeCents(4000, e), 200); // 5% de R$ 40
  assert.equal(ticketFeeCents(1000, e), 100); // piso de R$ 1,00
  assert.equal(ticketFeeCents(0, e), 0);
  assert.equal(ticketFeeCents(60, e), 60); // nunca passa do valor do ingresso
  assert.equal(ticketFeeCents(4000, getPlan("pro")), 140);
  assert.equal(ticketFeeCents(4000, getPlan("ilimitado")), 80);
});
test("quem paga a taxa", () => {
  const p = getPlan("essencial");
  assert.deepEqual(ticketTotals(4000, p, "buyer"), { feeCents: 200, buyerCents: 4200, venueCents: 4000 });
  assert.deepEqual(ticketTotals(4000, p, "venue"), { feeCents: 200, buyerCents: 4000, venueCents: 3800 });
});
test("plano desconhecido cai no Essencial", () => assert.equal(getPlan("xyz").id, "essencial"));
test("todo plano custa menos que o mercado em qualquer volume razoável", () => {
  for (const tickets of [50, 200, 500, 1500, 5000]) for (const price of [1500, 3000, 6000, 12000]) {
    const best = bestPlan(tickets, price);
    assert.ok(monthlyCostCents(best, tickets, price) < marketCostCents(tickets, price), `${tickets} x ${price}`);
  }
  assert.equal(bestPlan(50, 3000).id, "essencial");
  assert.equal(bestPlan(5000, 6000).id, "ilimitado");
  assert.equal(PLANS.length, 3);
});

import { statusFromPayments } from "./billing";
import { hashPassword, readSessionToken, seal, sessionToken, unseal, verifyPassword } from "./admin-auth";

test("situação da mensalidade a partir das cobranças", () => {
  const today = "2026-11-20";
  assert.equal(statusFromPayments([], today, true), "trial");
  assert.equal(statusFromPayments([{ status: "PENDING", dueDate: "2026-12-01" }], today, true), "trial");
  assert.equal(statusFromPayments([{ status: "PENDING", dueDate: "2026-12-01" }], today, false), "active");
  assert.equal(statusFromPayments([{ status: "RECEIVED", dueDate: "2026-11-01" }], today, true), "active");
  assert.equal(statusFromPayments([{ status: "OVERDUE", dueDate: "2026-11-15" }], today, false), "past_due"); // 5 dias
  assert.equal(statusFromPayments([{ status: "OVERDUE", dueDate: "2026-11-10" }, { status: "RECEIVED", dueDate: "2026-10-10" }], today, false), "blocked"); // 10 dias
});
test("sessão assinada, senha e segredo cifrado", () => {
  const t = sessionToken({ venueId: "abc", root: false });
  assert.deepEqual(readSessionToken(t), { venueId: "abc", root: false });
  assert.equal(readSessionToken(t.replace("v.abc", "r.abc")), null); // não dá para virar plataforma editando o cookie
  assert.equal(readSessionToken("v.abc.1.x"), null);
  const h = hashPassword("segredo-123");
  assert.equal(verifyPassword("segredo-123", h), true);
  assert.equal(verifyPassword("outra", h), false);
  assert.equal(verifyPassword("x", null), false);
  assert.equal(unseal(seal("$aact_prod_chave")), "$aact_prod_chave");
  assert.equal(unseal("g1.a.b.c"), null);
});

import { splitFor } from "./payments";
test("split nunca passa do líquido do Pix", () => {
  process.env.ASAAS_SPLIT_WALLET_ID = "carteira";
  assert.deepEqual(splitFor(200, 4200), { walletId: "carteira", fixedValue: 2 }); // R$ 40 + taxa
  assert.equal(splitFor(100, 200), null);   // ingresso de R$ 1 + R$ 1 de taxa: sobraria quase nada depois da tarifa do Asaas
  assert.equal(splitFor(100, 299), null);
  assert.deepEqual(splitFor(100, 300), { walletId: "carteira", fixedValue: 1 });
  assert.equal(splitFor(0, 5000), null);
  delete process.env.ASAAS_SPLIT_WALLET_ID;
  assert.equal(splitFor(200, 4200), null);
});
