import { body, fail, guardAdmin, handle, ok } from "@/lib/http";
import { generateCampaign } from "@/lib/ai";
import { currentEvent } from "@/lib/repo";
import { fmtDate } from "@/lib/format";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const b = await body<{ highlight: string; tone?: "festa" | "premium" | "urgencia" }>(req);
  if (!b.highlight?.trim()) return fail("Diga o que destacar");
  const ev = await currentEvent();
  return ok(await generateCampaign({ eventName: ev?.name ?? "Nossa festa", date: ev ? fmtDate(ev.starts_at) : "em breve", highlight: b.highlight.trim(), tone: b.tone }));
});
