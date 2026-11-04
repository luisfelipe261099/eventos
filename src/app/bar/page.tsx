import { Page, TopBar } from "@/components/ui";
import OrdersBoard from "../admin/OrdersBoard";
import { isAdmin } from "@/lib/admin-auth";
import Login from "../admin/Login";

export const metadata = { title: "Bar e cozinha" };
export const dynamic = "force-dynamic";

/** Tela do bar: pedidos do cardápio digital em tempo real. */
export default async function BarPage() {
  if (!(await isAdmin())) return <Login />;
  return (
    <Page>
      <TopBar title="Bar e cozinha" sub="Pedidos em tempo real" back="/" />
      <OrdersBoard />
    </Page>
  );
}
