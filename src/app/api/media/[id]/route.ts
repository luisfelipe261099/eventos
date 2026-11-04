import { pg, postgresUrl } from "@/lib/db";

export const runtime = "nodejs";

/** Serve flyers guardados no banco. O id é imutável, então o cache pode ser eterno. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!postgresUrl() || !/^[\w-]{6,64}$/.test(id)) return new Response("Não encontrado", { status: 404 });
  const [m] = await pg()`select mime, bytes from media where id = ${id}`;
  if (!m) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(m.bytes as Buffer), {
    headers: { "Content-Type": m.mime as string, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
