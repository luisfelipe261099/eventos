import { requireRoot } from "@/lib/admin-auth";
import { listAdmins } from "@/lib/admins";
import AdminsBox from "../AdminsBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe" };

export default async function Equipe() {
  await requireRoot();
  return (
    <>
      <h1 className="h-display text-2xl">Equipe</h1>
      <p className="mt-1 text-sm text-mut">Quem entra aqui como administrador da plataforma.</p>
      <AdminsBox admins={await listAdmins().catch(() => [])} />
    </>
  );
}
