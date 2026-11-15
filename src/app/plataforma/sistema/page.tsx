import { ensurePlatformReady } from "@/lib/platform";
import { setupStatus } from "@/lib/setup";
import { platformWallet } from "@/lib/payments";
import CopyField from "../CopyField";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sistema" };

function Check({ ok, title, children }: { ok: boolean | null; title: string; children: React.ReactNode }) {
  return (
    <li className="card flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok === null ? "bg-white/10 text-mut" : ok ? "bg-ok/20 text-ok" : "bg-warn/20 text-warn"}`}>{ok === null ? "i" : ok ? "✓" : "!"}</span>
      <div className="min-w-0 flex-1"><div className="font-semibold">{title}</div><div className="mt-1 text-sm text-mut">{children}</div></div>
    </li>
  );
}

/** Situação técnica. Tudo que o sistema consegue resolver sozinho, ele resolve; aqui só aparece o resultado. */
export default async function Sistema() {
  const [h, s] = await Promise.all([ensurePlatformReady(true), setupStatus()]);
  const acc = h.account;
  return (
    <>
      <h1 className="h-display text-2xl">Sistema</h1>
      <p className="mt-1 text-sm text-mut">Conferido agora. O que dá para corrigir sozinho é corrigido aqui mesmo.</p>
      {h.fixes.length > 0 && <p className="mt-3 rounded-xl bg-ok/10 p-3 text-sm text-ok">Corrigido agora: {h.fixes.join(" ")}</p>}
      <ul className="mt-4 space-y-3">
        <Check ok={s.supabase && s.tables} title="Banco de dados">{s.tables ? `Conectado e atualizado (${s.venues} casa(s)).` : "Sem conexão com o banco."}</Check>
        <Check ok={Boolean(acc && acc.general === "APPROVED") && !h.error} title="Conta Asaas da plataforma">
          {h.error ? `Erro ao consultar: ${h.error}` : acc ? <>{acc.name}. Cadastro {acc.general === "APPROVED" ? "aprovado" : "em análise"}.</> : "Chave da conta não configurada."}
        </Check>
        <Check ok={acc ? acc.bankAccount === "APPROVED" : null} title="Conta bancária no Asaas">
          {acc?.bankAccount === "APPROVED" ? "Aprovada: você consegue sacar o que é seu." : "Pendente. Só você consegue cadastrar, no app do Asaas: Menu → Minha conta → Dados bancários. Sem isso você recebe, mas não saca."}
        </Check>
        <Check ok={h.pixKeys > 0} title="Chave Pix da conta">{h.pixKeys > 0 ? "Ativa. O Asaas gera o QR Code das vendas." : "Sem chave Pix: o sistema cria uma assim que a conta estiver aprovada."}</Check>
        <Check ok={h.webhook} title="Aviso de pagamentos e repasses">{h.webhook ? "Ligado: ingresso liberado na hora em que o Pix cai." : "Não consegui ligar."}</Check>
        <Check ok={Boolean(platformWallet()) || true} title="Taxa da plataforma">Fica na conta da plataforma em cada venda; nas casas com conta Asaas própria, sai pelo split.</Check>
        <Check ok={s.billing} title="Mensalidades">{s.billing ? "Cobradas automaticamente na conta da plataforma (Pix, boleto ou cartão)." : "Sem a chave da plataforma, a cobrança é manual."}</Check>
        <Check ok={s.cronSecret} title="Rotina diária (14h)">Convites VIP, Pix vencido, mensalidades, conciliação e repasses automáticos.</Check>
        <Check ok={null} title="Repasse sem aprovação manual (opcional)">
          O Asaas pede aprovação (SMS ou app) em toda transferência. Para os repasses saírem sozinhos, ligue uma vez no app do Asaas: <b className="text-white">Menu → Integrações → Mecanismos de segurança → Validação de saque via webhook</b>. Se a mesma conta for usada por outro sistema que transfere por API, não ligue: as transferências dele seriam recusadas.
          <div className="mt-2 flex flex-wrap gap-2"><CopyField value={h.saqueUrl} label="Copiar URL" /><CopyField value={h.saqueToken || "—"} label="Copiar token" /></div>
        </Check>
      </ul>
    </>
  );
}
