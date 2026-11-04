import { Legal } from "@/components/Legal";
export const metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <Legal title="Política de privacidade" updated="novembro de 2026">
      <p>Explicamos aqui, de forma simples, quais dados usamos e por quê, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li><b>Cadastro:</b> nome, WhatsApp e, para pagamentos via Pix, CPF.</li>
        <li><b>Uso no evento:</b> ingressos comprados, horário de entrada, pedidos e consumo na comanda.</li>
        <li><b>Promoters:</b> localização do celular <i>apenas no momento</i> em que o promoter confirma a presença de um convidado.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Emitir e validar seu ingresso e processar pagamentos (execução de contrato).</li>
        <li>Evitar fraudes, como ingressos duplicados ou falsificados (legítimo interesse).</li>
        <li>Analisar a frequência e o consumo para que a casa melhore o atendimento e envie convites e ofertas. Você pode pedir para não receber mais esses contatos.</li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <p>Com a casa organizadora do evento e com o Asaas, que processa os pagamentos. Não vendemos seus dados.</p>
      <h2>Por quanto tempo guardamos</h2>
      <p>Enquanto houver relação com a casa e pelo prazo exigido por obrigações legais e fiscais.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção, exclusão ou portabilidade dos seus dados, e revogar consentimentos, pelo canal de ajuda do app ou diretamente com a casa organizadora.</p>
      <p className="mt-8 text-xs text-nevoa">Modelo de referência. Revise com um advogado e indique o controlador (CNPJ e contato do encarregado) antes de usar comercialmente.</p>
    </Legal>
  );
}
