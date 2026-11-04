import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemoData } from "./demo";
import { customerProfiles, productStats, demandForecast, invitesForToday } from "./insights";
import { makeQrPayload, verifyQrPayload } from "./qr";
import { insideGeofence } from "./geo";

const ds = buildDemoData();

test("Rafael é detectado como VIP que vai toda sexta", () => {
  const p = customerProfiles(ds).find((x) => x.customer.id === "c-rafael")!;
  assert.equal(p.segment, "vip");
  assert.equal(p.favoriteWeekday, 5);
  assert.ok(p.avgSpendCents >= 480000 && p.avgSpendCents <= 560000, `gasto médio ${p.avgSpendCents}`);
  assert.match(p.action!, /quinta/);
});

test("convites saem na quinta para quem vai na sexta", () => {
  const thursday = new Date("2026-11-05T17:00:00Z").getTime(); // quinta 14h BRT
  const list = invitesForToday(customerProfiles(ds, thursday), thursday);
  assert.ok(list.some((p) => p.customer.id === "c-rafael"));
});

test("caipirinha de kiwi aparece como parada com promoção que mantém margem", () => {
  const kiwi = productStats(ds).find((s) => s.product.id === "p-caipi-k")!;
  assert.equal(kiwi.status, "parado");
  assert.ok(kiwi.suggestion && kiwi.suggestion.marginAfterCents > 0);
  const chopp = productStats(ds).find((s) => s.product.id === "p-chopp")!;
  assert.equal(chopp.status, "estrela");
});

test("previsão de público e equipe", () => {
  const live = ds.events.find((e) => e.id === "ev-0")!;
  const f = demandForecast(ds, live.id);
  assert.ok(f.expectedAttendance > 0);
  assert.ok(f.staff.bartenders >= 2);
});

test("QR dinâmico valida, expira e rejeita assinatura errada", async () => {
  const seeds = new Map([["tk-1", "segredo"]]);
  const now = Date.now();
  const code = await makeQrPayload("tk-1", "segredo", now);
  assert.deepEqual(await verifyQrPayload(code, seeds, now), { ok: true, ticketId: "tk-1" });
  assert.equal((await verifyQrPayload(code, seeds, now + 5 * 60_000)).ok, false);
  assert.equal((await verifyQrPayload(code.slice(0, -2) + "xx", seeds, now)).ok, false);
});

test("geofence", () => {
  const v = { lat: -25.4284, lng: -49.2733, geofence_m: 80 };
  assert.equal(insideGeofence({ lat: -25.4285, lng: -49.2734 }, v).inside, true);
  assert.equal(insideGeofence({ lat: -25.44, lng: -49.28 }, v).inside, false);
});
