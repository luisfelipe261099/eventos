import { notFound } from "next/navigation";
import { currentEvent, getVenueBySlug, listProducts } from "@/lib/repo";
import { ClientShell } from "@/components/client";
import Menu from "./Menu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cardápio" };

export default async function CardapioPage({ params, searchParams }: { params: Promise<{ venue: string }>; searchParams: Promise<{ mesa?: string }> }) {
  const { venue: slug } = await params;
  const { mesa } = await searchParams;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();
  const [products, ev] = await Promise.all([listProducts(venue.id), currentEvent(venue.id)]);
  const table = mesa ? `Mesa ${mesa}` : "Pista";
  return (
    <ClientShell back="/">
      <div className="mx-auto max-w-md pt-6">
        <p className="text-sm text-nevoa">{venue.name} · {table}</p>
        <h1 className="h-display text-[34px]">Cardápio</h1>
        {!ev ? <p className="mt-6 text-nevoa">O cardápio abre quando a casa estiver funcionando.</p> : <Menu products={products} table={table} venue={venue.slug} />}
      </div>
    </ClientShell>
  );
}
