import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/db";
import { PLANS, TRIAL_DAYS, getPlan } from "@/lib/plans";
import { ClientShell } from "@/components/client";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cadastrar minha casa", description: "Crie a conta da sua casa na VipFlow e comece a vender ingressos em minutos. 30 dias grátis." };

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  return (
    <ClientShell back="/planos">
      <div className="mx-auto max-w-md pt-8">
        <h1 className="poster text-[44px] uppercase">Cadastre sua casa</h1>
        <p className="mt-2 text-nevoa">{TRIAL_DAYS} dias grátis, sem cartão. Depois você escolhe se continua. <Link href="/planos" className="underline">Ver planos</Link>.</p>
        {isSupabaseConfigured()
          ? <SignupForm plans={PLANS.map((p) => ({ id: p.id, name: p.name }))} initialPlan={getPlan(plano).id} />
          : <div className="sheet mt-6 p-6"><p className="font-medium">O cadastro abre em breve.</p><p className="mt-1 text-sm text-nevoa">Esta é a versão de demonstração. Enquanto isso, veja o sistema funcionando no <Link href="/simular" className="underline">simulador</Link> ou deixe seu contato na <Link href="/planos" className="underline">página de planos</Link>.</p></div>}
      </div>
    </ClientShell>
  );
}
