import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { currentEvent, liveOrders, setOrderStatus } from "@/lib/repo";
import type { OrderStatus } from "@/lib/types";

export const GET = handle(async () => {
  const denied = await guardAdmin(); if (denied) return denied;
  const ev = await currentEvent();
  return ok({ orders: ev ? await liveOrders(ev.id) : [] });
});

const NEXT: Record<string, OrderStatus> = { queued: "preparing", preparing: "ready", ready: "delivered" };
export const PATCH = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const b = await body<{ id: string; status?: OrderStatus; current?: string }>(req);
  const status = b.status ?? NEXT[b.current ?? ""];
  if (!b.id || !status) return fail("Status inválido");
  return ok(await setOrderStatus(b.id, status));
});
