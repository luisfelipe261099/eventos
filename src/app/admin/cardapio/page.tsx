import { db } from "@/lib/db";
import type { Product } from "@/lib/types";
import { getVenueOrNull } from "@/lib/repo";
import { Page, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import ProductsEditor from "./ProductsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cardápio" };

export default async function CardapioAdmin() {
  const venue = await getVenueOrNull();
  const products = venue ? await db().select<Product>("products", { venue_id: venue.id }) : [];
  return (
    <Page wide>
      <TopBar title="Cardápio" sub="Produtos, preços e estoque" back="/" />
      <AdminNav active="/admin/cardapio" />
      <ProductsEditor initial={products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))} venueSlug={venue?.slug ?? ""} />
    </Page>
  );
}
