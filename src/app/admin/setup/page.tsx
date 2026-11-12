import { setupStatus } from "@/lib/setup";
import { Page, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import SetupClient from "./SetupClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuração" };

export default async function SetupPage() {
  const s = await setupStatus();
  return (
    <Page wide>
      <TopBar title="Configuração" sub="Deixe a Casa Cheia pronta para operar" back="/" />
      <AdminNav active="/admin/setup" />
      <SetupClient initial={s} />
    </Page>
  );
}
