import { listPromoters, promoterByCode } from "@/lib/repo";
import { isSupabaseConfigured } from "@/lib/db";
import { Page, TopBar } from "@/components/ui";
import PromoterApp from "./PromoterApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promoter" };

export default async function PromoterPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k } = await searchParams;
  const demo = !isSupabaseConfigured();
  const fromLink = await promoterByCode(k);
  const choices = demo ? (await listPromoters()).map((p) => ({ code: p.access_code ?? p.id, name: p.name })) : [];
  return (
    <Page>
      <TopBar title="Lista VIP" sub="App do promoter" back="/" />
      <PromoterApp demoChoices={choices} linkCode={fromLink ? (fromLink.access_code ?? fromLink.id) : null} invalidLink={Boolean(k) && !fromLink} />
    </Page>
  );
}
