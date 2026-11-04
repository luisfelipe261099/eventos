/**
 * Envio de WhatsApp.
 * - Com WHATSAPP_TOKEN + WHATSAPP_PHONE_ID (WhatsApp Cloud API da Meta) → envia direto.
 *   Atenção: fora da janela de 24h a Meta exige mensagem de TEMPLATE aprovado
 *   (e cobra por mensagem). Configure WHATSAPP_TEMPLATE para isso.
 * - Sem configuração → gera link wa.me para a equipe enviar com 1 toque (grátis).
 */
export const whatsappEnabled = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export async function sendWhatsApp(phone: string, text: string): Promise<{ sent: boolean; link: string }> {
  const link = waLink(phone, text);
  if (!whatsappEnabled()) return { sent: false, link };
  const to = phone.replace(/\D/g, "");
  const template = process.env.WHATSAPP_TEMPLATE;
  const payload = template
    ? { messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: "pt_BR" }, components: [{ type: "body", parameters: [{ type: "text", text }] }] } }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: text } };
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("[whatsapp]", res.status, await res.text());
  return { sent: res.ok, link };
}
