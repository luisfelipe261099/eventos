import { isAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import Login from "./Login";
import { isSupabaseConfigured } from "@/lib/db";
import { getVenueOrNull } from "@/lib/repo";
import { trialDaysLeft } from "@/lib/billing";

export const metadata = { title: "Painel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <Login />;
  const v = isSupabaseConfigured() ? await getVenueOrNull().catch(() => null) : null;
  const left = v ? trialDaysLeft(v) : 0;
  const notice = !v ? null
    : v.plan_status === "blocked" ? { bad: true, text: "As vendas online estão pausadas: a mensalidade está em atraso." }
    : v.plan_status === "past_due" ? { bad: false, text: "A mensalidade está em atraso. Regularize para não pausar as vendas." }
    : v.plan_status === "trial" && left <= 5 && !v.billing_subscription_id ? { bad: false, text: left > 0 ? `Seu período grátis termina em ${left} dia(s). Escolha o plano para continuar.` : "Seu período grátis terminou. Escolha o plano para continuar." }
    : null;
  return (
    <>
      {notice && (
        <Link href="/admin/plano" className={`block px-4 py-2.5 text-center text-sm font-medium ${notice.bad ? "bg-[#ff7a8c] text-[#2a0710]" : "bg-[#ffb347] text-[#2b1a00]"}`}>
          {notice.text} <span className="underline">Ver plano</span>
        </Link>
      )}
      {children}
    </>
  );
}
