import { Legal } from "@/components/Legal";
export const metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <Legal title="Termos de uso" updated="novembro de 2026">
      <p>Estes termos valem para quem compra ingressos, faz pedidos pelo cardápio digital ou usa os apps da Casa Cheia. Ao comprar, você concorda com eles.</p>
      <h2>1. O que a Casa Cheia faz</h2>
      <p>A Casa Cheia é a plataforma de tecnologia usada pela casa de eventos para vender ingressos, controlar a entrada e receber pedidos. O evento, as atrações, o cardápio e o atendimento são de responsabilidade da casa organizadora.</p>
      <h2>2. Ingressos</h2>
      <ul>
        <li>O ingresso é pessoal e fica no seu celular, com um QR code que muda a cada 30 segundos. Prints não são aceitos na entrada.</li>
        <li>Cada ingresso permite uma única entrada. Depois de validado, não pode ser usado de novo.</li>
        <li>Pode ser exigido documento oficial com foto, e a casa pode recusar a entrada de menores de idade conforme a classificação do evento.</li>
        <li>A casa pode recusar a entrada ou retirar quem descumprir as regras do local, sem reembolso, nos limites da lei.</li>
      </ul>
      <h2>3. Pagamentos</h2>
      <p>Os pagamentos são feitos por Pix, processados pelo Asaas, e o valor vai direto para a conta da casa. Para gerar o Pix pedimos seu CPF, exigência do meio de pagamento. Um ingresso com Pix não pago em até 30 minutos é cancelado automaticamente, o código Pix deixa de valer e a vaga volta para a venda. Se o pagamento ainda assim for recebido, o ingresso é liberado. Quando houver taxa de serviço no ingresso, ela aparece separada do preço antes do pagamento, e o total mostrado é o total cobrado: não há outra taxa depois.</p>
      <h2>4. Cardápio e comandas</h2>
      <p>Os pedidos feitos pelo celular entram na sua comanda e devem ser pagos antes da saída. Os preços exibidos no cardápio digital são os preços praticados pela casa no momento do pedido. A taxa de serviço, quando cobrada, aparece separada.</p>
      <h2>5. Cancelamento</h2>
      <p>Veja a <a className="text-violeta underline" href="/cancelamento">política de cancelamento e reembolso</a>.</p>
      <h2>6. Para casas e produtores</h2>
      <p>A casa que usa a Casa Cheia paga a mensalidade do plano escolhido e uma taxa por ingresso pago, nos valores publicados em <a className="text-violeta underline" href="/planos">Planos e preços</a>. Ingressos gratuitos, cardápio e comandas não têm taxa. Não há fidelidade nem volume mínimo: a casa pode trocar de plano ou cancelar quando quiser. Com a mensalidade em atraso por mais de 10 dias, a venda online da casa fica pausada até a regularização. Os dados de clientes, vendas e consumo da casa podem ser exportados a qualquer momento pelo painel.</p>
      <h2>7. Contato</h2>
      <p>Dúvidas sobre o evento devem ser enviadas à casa organizadora. Dúvidas sobre a plataforma, pelo canal de ajuda do app.</p>
      <p className="mt-8 text-xs text-nevoa">Modelo de referência. Revise com um advogado antes de usar comercialmente.</p>
    </Legal>
  );
}
