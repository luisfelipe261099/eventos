import { listPromoters } from "@/lib/repo";
import { Page, TopBar } from "@/components/ui";
import PromoterApp from "./PromoterApp";

export const dynamic = "force-dynamic";

export default async function PromoterPage() {
  const promoters = await listPromoters();
  return (
    <Page>
      <TopBar title="Lista VIP" sub="App do promoter" back="/" />
      <PromoterApp promoters={promoters.map((p) => ({ id: p.id, name: p.name }))} />
    </Page>
  );
}
