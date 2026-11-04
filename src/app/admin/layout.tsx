import { isAdmin } from "@/lib/admin-auth";
import Login from "./Login";

export const metadata = { title: "Painel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <Login />;
  return children;
}
