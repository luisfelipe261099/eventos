import { db } from "@/lib/db";
import type { GuestListEntry, Promoter } from "@/lib/types";
import { Page, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import PromotersEditor from "./PromotersEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promoters" };

export default async function PromotersAdmin() {
  const [promoters, gl] = await Promise.all([db().select<Promoter>("promoters"), db().select<GuestListEntry>("guest_list")]);
  const stats = Object.fromEntries(promoters.map((p) => [p.id, { total: gl.filter((g) => g.promoter_id === p.id).length, inside: gl.filter((g) => g.promoter_id === p.id && g.status === "inside").length }]));
  return (
    <Page wide>
      <TopBar title="Promoters" sub="Equipe de vendas e comissões" back="/" />
      <AdminNav active="/admin/promoters" />
      <PromotersEditor initial={promoters} stats={stats} />
    </Page>
  );
}
