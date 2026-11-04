import { notFound } from "next/navigation";
import { currentEvent, getVenueBySlug, listProducts } from "@/lib/repo";
import { Page, TopBar } from "@/components/ui";
import Menu from "./Menu";

export const dynamic = "force-dynamic";

export default async function CardapioPage({ params, searchParams }: { params: Promise<{ venue: string }>; searchParams: Promise<{ mesa?: string }> }) {
  const { venue: slug } = await params;
  const { mesa } = await searchParams;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();
  const [products, ev] = await Promise.all([listProducts(), currentEvent()]);
  const table = mesa ? `Mesa ${mesa}` : "Pista";
  return (
    <Page>
      <TopBar title="Cardápio" sub={`${venue.name} · ${table}`} back="/" />
      {!ev ? <p className="text-mut">Nenhum evento acontecendo agora.</p> : <Menu products={products} table={table} />}
    </Page>
  );
}
