import { guardAdmin, handle, ok } from "@/lib/http";
import { runVipInvites } from "@/lib/invites";

export const POST = handle(async () => {
  const denied = await guardAdmin(); if (denied) return denied;
  return ok(await runVipInvites({ force: true }));
});
