import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/db";
import Login from "../admin/Login";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar", robots: { index: false } };

/** Entrada única: dono de casa vai para o painel dela; administrador, para a plataforma. */
export default async function Entrar() {
  const s = isSupabaseConfigured() ? await getSession() : null;
  if (s?.root && !s.venueId) redirect("/plataforma");
  if (s) redirect("/admin");
  return <Login />;
}
