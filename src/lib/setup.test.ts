import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { MIGRATIONS } from "./setup";
import { isValidCpf } from "./format";
import { isPaidStatus } from "./payments";

test("lista de migrações bate com os arquivos", () => {
  assert.deepEqual(MIGRATIONS, readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort());
});
test("CPF", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("529.982.247-24"), false);
});
test("Pix só conta como pago quando recebido", () => {
  assert.equal(isPaidStatus("RECEIVED"), true);
  assert.equal(isPaidStatus("CONFIRMED", "PIX"), false);
  assert.equal(isPaidStatus("CONFIRMED", "CREDIT_CARD"), true);
  assert.equal(isPaidStatus("PENDING"), false);
});
