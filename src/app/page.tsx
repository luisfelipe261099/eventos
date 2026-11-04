import Link from "next/link";
import { upcomingShowcase } from "@/lib/repo";
import { isSupabaseConfigured } from "@/lib/db";
import { brl } from "@/lib/format";
import { ClientShell, DateStamp, Flyer, Footer, Icon, longDate } from "@/components/client";

export const dynamic = "force-dynamic";

const CATS = ["Todos", "Festas", "Shows", "Barzinho"] as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat = "Todos", q = "" } = await searchParams;
  const all = await upcomingShowcase();
  const term = q.trim().toLowerCase();
  const list = all.filter((e) => (cat === "Todos" || e.category === cat) && (!term || `${e.name} ${e.venue?.name ?? ""}`.toLowerCase().includes(term)));
  const featured = list.slice(0, 4);
  const qs = (c: string) => `/?${new URLSearchParams({ ...(c !== "Todos" ? { cat: c } : {}), ...(q ? { q } : {}) })}`;

  return (
    <ClientShell bare>
      <nav className="sticky top-16 z-20 border-b border-linha bg-papel/95 backdrop-blur" aria-label="Categorias">
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-7 overflow-x-auto px-4">
          {CATS.map((c) => (
            <Link key={c} href={qs(c)} aria-current={cat === c ? "page" : undefined}
              className={`relative whitespace-nowrap py-4 text-[17px] ${cat === c ? "font-semibold text-violeta" : "text-tinta/80 hover:text-tinta"}`}>
              {c}
              {cat === c && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-violeta" />}
            </Link>
          ))}
        </div>
      </nav>

      {!isSupabaseConfigured() && (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Link href="/simular" className="flex items-center gap-4 rounded-2xl bg-breu p-4 text-white">
            <div className="flex-1">
              <div className="font-semibold">Simule uma noite completa</div>
              <div className="text-sm text-white/65">Compra, portaria, cardápio, bar, Pix e IA funcionando juntos. Eventos fictícios.</div>
            </div>
            <span className="rounded-full bg-violeta px-4 py-2 text-sm font-semibold">Abrir</span>
          </Link>
        </div>
      )}

      {featured.length > 0 && (
        <section aria-label="Em destaque" className="mx-auto max-w-5xl pt-4">
          <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2">
            {featured.map((e, i) => (
              <article key={e.id} className="w-[84%] shrink-0 snap-start sm:w-[420px]">
                <Link href={`/e/${e.slug}`} className="block overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(22,20,28,.55)]">
                  <Flyer src={e.cover_url} alt={e.name} sizes="(max-width: 640px) 84vw, 420px" priority={i === 0} />
                </Link>
                <div className="px-1 pt-4">
                  <h2 className="poster text-[34px] uppercase">{e.name}</h2>
                  <p className="mt-2 flex items-start gap-2 text-[15px] text-tinta/80"><Icon name="pin" size={18} className="mt-0.5 shrink-0 text-nevoa" />{[e.venue?.name, e.venue?.city].filter(Boolean).join(", ")}</p>
                  <p className="mt-1 flex items-center gap-2 text-[15px] text-tinta/80"><Icon name="calendar" size={18} className="shrink-0 text-nevoa" />{longDate(e.starts_at)}</p>
                  <Link href={`/e/${e.slug}`} className="btn-primary mt-4">{e.soldOut ? "Ver evento" : "Comprar ingresso"}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pt-10">
        <form action="/" className="relative">
          {cat !== "Todos" && <input type="hidden" name="cat" value={cat} />}
          <label htmlFor="q" className="sr-only">Buscar evento ou casa</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar evento ou casa" className="field rounded-full pr-14 shadow-sm" />
          <button aria-label="Buscar" className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-violeta text-white"><Icon name="search" size={18} /></button>
        </form>

        <h2 className="h-display mt-10 text-[28px]">Próximos eventos</h2>
        {list.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-linha p-8 text-center text-nevoa">
            Nenhum evento encontrado{term ? ` para “${q}”` : ""}. <Link href="/" className="font-medium text-violeta">Ver todos os eventos</Link>
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
            {list.map((e) => (
              <li key={e.id}>
                <Link href={`/e/${e.slug}`} className="group block">
                  <div className="relative overflow-hidden rounded-2xl">
                    <Flyer src={e.cover_url} alt={e.name} sizes="(max-width: 768px) 46vw, 240px" className="transition-transform duration-300 group-hover:scale-[1.02]" />
                    <DateStamp iso={e.starts_at} className="absolute right-2 top-2" />
                    {e.soldOut && <span className="absolute bottom-2 left-2 rounded-full bg-breu px-2.5 py-1 text-xs font-semibold text-white">Esgotado</span>}
                  </div>
                  <h3 className="poster mt-3 text-[21px] uppercase">{e.name}</h3>
                  <p className="mt-1 truncate text-sm text-nevoa">{e.venue?.name}</p>
                  {e.fromCents !== null && <p className="mt-0.5 text-sm font-semibold">a partir de {brl(e.fromCents)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto mt-14 max-w-5xl px-4">
        <div className="overflow-hidden rounded-[28px] bg-breu p-7 text-white md:flex md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="poster text-[38px] uppercase">Tem uma casa ou produz eventos?</h2>
            <p className="mt-3 max-w-md text-white/70">Venda ingressos, receba o Pix direto na sua conta, controle a porta mesmo sem internet e veja o que mais vende no bar.</p>
          </div>
          <Link href="/admin" className="btn-primary mt-6 md:mt-0">Conhecer o painel</Link>
        </div>
      </section>

      <Footer />
    </ClientShell>
  );
}
