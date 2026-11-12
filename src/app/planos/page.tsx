import Link from "next/link";
import type { Metadata } from "next";
import { MARKET, PLANS, TRIAL_DAYS } from "@/lib/plans";
import { brl } from "@/lib/format";
import { ClientShell, Footer, Icon } from "@/components/client";
import Calculator from "./Calculator";
import LeadForm from "./LeadForm";

export const metadata: Metadata = {
  title: "Planos e preços",
  description: "Ingressos, portaria, cardápio digital, comandas e promoters em um só sistema. Mensalidade a partir de R$ 79 e taxa por ingresso a partir de 2%.",
};

const pct = (n: number) => `${String(n).replace(".", ",")}%`;

const INCLUDED = [
  "Venda de ingressos com Pix e QR dinâmico", "Portaria que funciona sem internet", "Cardápio digital e comandas por mesa", "Tela do bar em tempo real",
  "App do promoter com lista VIP e GPS", "Painel com IA: clientes VIP, produtos parados e previsão", "Financeiro, estorno e planilhas", "Eventos, lotes e promoters ilimitados",
];

const COMPARE: [string, string, string][] = [
  ["Taxa por ingresso", `${pct(PLANS[2].feePercent)} a ${pct(PLANS[0].feePercent)}`, `${MARKET.feePercent}% (até 20% em casas noturnas)`],
  ["Taxa mínima por ingresso", `${brl(PLANS[2].feeMinCents)} a ${brl(PLANS[0].feeMinCents)}`, "R$ 2,00 a R$ 3,99"],
  ["Quando o dinheiro chega", "Na hora, direto na conta da casa", "De 2 a 15 dias úteis depois do evento"],
  ["Cardápio digital e comandas", "Incluso", "Outro sistema: R$ 100 a R$ 300 por mês"],
  ["Lista VIP e promoters", "Incluso", "Outro sistema ou planilha"],
  ["Ingresso grátis", "Sem taxa", "Sem taxa"],
  ["Fidelidade e volume mínimo", "Não tem", "Comum em contrato"],
];

export default function Planos() {
  return (
    <ClientShell bare>
      <section className="bg-breu text-white">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-12">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-violeta">Para casas, bares e produtores</p>
          <h1 className="poster mt-3 max-w-3xl text-[52px] uppercase md:text-[76px]">Metade da taxa. Dinheiro na hora.</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">Ingressos, portaria, cardápio, comandas e promoters em um só sistema. Você paga uma mensalidade pequena e uma taxa por ingresso que é a metade da cobrada pelas ticketeiras, e o Pix de cada venda cai direto na sua conta.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cadastro" className="btn-primary">Começar {TRIAL_DAYS} dias grátis</Link>
            <Link href="/simular" className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-[15px] font-medium hover:bg-white/10">Ver funcionando</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <section className="-mt-6 grid gap-4 md:grid-cols-3" aria-label="Planos">
          {PLANS.map((p, i) => (
            <div key={p.id} className={`sheet flex flex-col p-6 ${i === 1 ? "ring-2 ring-violeta" : ""}`}>
              <div className="flex items-center justify-between"><h2 className="h-display text-2xl">{p.name}</h2>{i === 1 && <span className="rounded-full bg-violeta px-3 py-1 text-xs font-semibold text-white">Mais escolhido</span>}</div>
              <p className="mt-1 text-sm text-nevoa">{p.pitch}</p>
              <div className="mt-5"><span className="poster text-[52px]">{brl(p.monthlyCents)}</span><span className="text-nevoa"> por mês</span></div>
              <div className="mt-1 text-[17px] font-semibold">+ {pct(p.feePercent)} por ingresso pago</div>
              <div className="text-sm text-nevoa">Mínimo de {brl(p.feeMinCents)} por ingresso. Grátis não paga.</div>
              <Link href={`/cadastro?plano=${p.id}`} className={`${i === 1 ? "btn-primary" : "btn-dark"} mt-6`}>Começar grátis</Link>
            </div>
          ))}
        </section>
        <p className="mt-4 text-center text-sm text-nevoa">Os três planos têm todos os recursos. A diferença é só o volume: quanto mais ingresso você vende, mais vale a mensalidade maior com a taxa menor.</p>

        <section className="mt-14">
          <h2 className="h-display text-[30px]">Quanto você paga por mês</h2>
          <p className="mt-1 text-nevoa">Arraste para o seu volume. A comparação usa uma ticketeira a {MARKET.feePercent}% (mínimo de {brl(MARKET.feeMinCents)}) somada a um sistema de comandas de {brl(MARKET.barSystemCents)} por mês.</p>
          <Calculator />
        </section>

        <section className="mt-14">
          <h2 className="h-display text-[30px]">Tudo incluso em todos os planos</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((t) => <li key={t} className="flex gap-3"><Icon name="check" className="mt-0.5 shrink-0 text-verde" /><span>{t}</span></li>)}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="h-display text-[30px]">Casa Cheia e o mercado</h2>
          <div className="mt-5 overflow-x-auto rounded-[20px] bg-white">
            <table className="w-full min-w-[620px] text-left text-[15px]">
              <thead><tr className="border-b border-linha text-sm text-nevoa"><th className="p-4 font-medium"> </th><th className="p-4 font-semibold text-violeta">Casa Cheia</th><th className="p-4 font-medium">Ticketeira + sistema de bar</th></tr></thead>
              <tbody>{COMPARE.map(([k, a, b]) => <tr key={k} className="border-b border-linha last:border-0"><th className="p-4 font-medium">{k}</th><td className="p-4 font-semibold">{a}</td><td className="p-4 text-nevoa">{b}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-nevoa">Valores de mercado levantados em novembro de 2026 nas páginas públicas de preços de ticketeiras e sistemas de comanda. Cada empresa tem suas condições; confira antes de comparar um caso específico. A tarifa do Pix é cobrada pelo Asaas direto na conta da casa (em torno de R$ 2 por Pix recebido).</p>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="h-display text-[30px]">Perguntas comuns</h2>
            <dl className="mt-5 space-y-5">
              <div><dt className="font-semibold">Quem paga a taxa do ingresso?</dt><dd className="mt-1 text-nevoa">Você escolhe no painel. Ela pode aparecer para o cliente como taxa de serviço ou sair do valor que a casa recebe.</dd></div>
              <div><dt className="font-semibold">Quando recebo o dinheiro?</dt><dd className="mt-1 text-nevoa">Na hora. A venda é feita na conta Asaas da própria casa, então o Pix não passa pela Casa Cheia.</dd></div>
              <div><dt className="font-semibold">E se eu não vender nada no mês?</dt><dd className="mt-1 text-nevoa">Paga só a mensalidade. Não existe volume mínimo.</dd></div>
              <div><dt className="font-semibold">Tem fidelidade?</dt><dd className="mt-1 text-nevoa">Não. Você troca de plano ou cancela quando quiser.</dd></div>
              <div><dt className="font-semibold">O bar e as comandas pagam taxa?</dt><dd className="mt-1 text-nevoa">Não. A taxa é só sobre ingresso pago. Cardápio e comandas já estão na mensalidade.</dd></div>
            </dl>
          </div>
          <div className="sheet p-6">
            <h2 className="h-display text-2xl">Prefere conversar antes?</h2>
            <p className="mt-1 text-sm text-nevoa">Deixe seu WhatsApp e a gente chama você.</p>
            <LeadForm />
          </div>
        </section>
      </div>
      <Footer />
    </ClientShell>
  );
}
