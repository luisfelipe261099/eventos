import { db } from "@/lib/db";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contatos" };

/** Quem pediu contato pela página de planos. */
export default async function Contatos() {
  const leads = (await db().select<Lead>("leads").catch(() => [] as Lead[])).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <h1 className="h-display text-2xl">Contatos <span className="text-base font-normal text-mut">· {leads.length}</span></h1>
      <p className="mt-1 text-sm text-mut">Donos de casa que pediram para ser chamados na página de planos.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {leads.slice(0, 120).map((l) => (
          <li key={l.id} className="card">
            <div className="font-semibold">{l.name}</div>
            <div className="text-sm text-mut">{[l.venue_name, l.city, l.plan].filter(Boolean).join(" · ")}</div>
            <a className="mt-2 inline-block text-brandl underline" href={`https://wa.me/55${l.phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">Chamar no WhatsApp · {l.phone}</a>
            <div className="text-xs text-mut">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
          </li>
        ))}
        {leads.length === 0 && <li className="text-sm text-mut">Nenhum pedido ainda.</li>}
      </ul>
    </>
  );
}
