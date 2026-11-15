import { NextResponse } from "next/server";
import { body, fail, handle } from "@/lib/http";
import { sessionCookie } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/db";
import { attempts, registerAttempt } from "@/lib/rate-limit";
import { createVenueAccount, VenueInputError, type NewVenue } from "@/lib/venues";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cadastro de uma casa nova: cria a conta, começa o período grátis e já entra no painel. */
export const POST = handle(async (req: Request) => {
  if (!isSupabaseConfigured()) return fail("O cadastro abre quando o banco de dados estiver conectado. Por enquanto, explore a demonstração.", 503);
  const ip = `signup:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if ((await attempts(ip, 60)) >= 5) return fail("Muitos cadastros deste endereço. Tente de novo em uma hora.", 429);
  const b = await body<NewVenue>(req);
  if ((b.password ?? "").length < 8) return fail("A senha precisa de pelo menos 8 caracteres.");
  try {
    const { venue } = await createVenueAccount(b);
    await registerAttempt(ip);
    const res = NextResponse.json({ ok: true, slug: venue.slug });
    const c = sessionCookie({ venueId: venue.id, root: false });
    res.cookies.set(c.name, c.value, c.options);
    return res;
  } catch (e) {
    if (e instanceof VenueInputError) return fail(e.message, /Já existe/.test(e.message) ? 409 : 400);
    throw e;
  }
});
