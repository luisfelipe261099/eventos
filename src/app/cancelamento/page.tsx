import { Legal } from "@/components/Legal";
export const metadata = { title: "Cancelamento e reembolso" };

export default function Cancelamento() {
  return (
    <Legal title="Cancelamento e reembolso" updated="novembro de 2026">
      <h2>Desistência da compra</h2>
      <p>Compras feitas pela internet podem ser canceladas em até <b>7 dias</b> após a compra (Código de Defesa do Consumidor, art. 49), desde que o pedido seja feito <b>antes do início do evento</b> e o ingresso não tenha sido usado. O valor volta pelo mesmo Pix usado no pagamento, <b>incluindo a taxa de serviço</b>, quando houver.</p>
      <h2>Evento cancelado ou adiado</h2>
      <p>Se a casa cancelar o evento, o valor é devolvido integralmente, com a taxa de serviço. Se o evento for adiado, o ingresso vale para a nova data. Se você não puder ir na nova data, pode pedir o reembolso.</p>
      <h2>Consumo no bar</h2>
      <p>Pedidos já preparados ou entregues não são reembolsáveis. Se houver erro no pedido, fale com a equipe do bar na hora.</p>
      <h2>Como pedir</h2>
      <p>Pelo canal de ajuda do app, informando o nome usado na compra e o WhatsApp. O estorno é feito pela casa, e o prazo de crédito depende do seu banco.</p>
      <p className="mt-8 text-xs text-nevoa">Modelo de referência. Ajuste às regras da casa e revise com um advogado antes de usar comercialmente.</p>
    </Legal>
  );
}
