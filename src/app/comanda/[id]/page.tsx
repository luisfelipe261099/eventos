import { Page, TopBar } from "@/components/ui";
import TabView from "./TabView";

export default async function ComandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page>
      <TopBar title="Minha comanda" sub="Acompanhe seus pedidos" back="/" />
      <TabView id={id} />
    </Page>
  );
}
