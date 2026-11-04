import { customerProfiles, invitesForToday } from "./insights";
import { createTicket, currentEvent, getTicketTypes, listInvites, loadDataset, saveInvite } from "./repo";
import { generateInviteMessage } from "./ai";
import { sendWhatsApp } from "./whatsapp";
import { WEEKDAYS } from "./format";

/**
 * Rotina da IA de clientes: na véspera do dia favorito de cada VIP,
 * gera um ingresso free, escreve um convite personalizado e envia.
 * Roda todo dia pelo Vercel Cron (14h) ou manualmente pelo painel.
 */
export async function runVipInvites(opts: { now?: number; force?: boolean } = {}) {
  const now = opts.now ?? Date.now();
  const ev = await currentEvent();
  if (!ev) return { event: null, invited: [] };
  const ds = await loadDataset();
  const profiles = customerProfiles(ds, now);
  const targets = opts.force ? profiles.filter((p) => p.segment === "vip" || p.segment === "potencial") : invitesForToday(profiles, now);
  const already = new Set((await listInvites()).filter((i) => i.event_id === ev.id).map((i) => i.customer_id));
  const types = await getTicketTypes(ev.id);
  const type = types.find((t) => /camarote|vip/i.test(t.name)) ?? types[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const invited = [];
  for (const p of targets) {
    if (already.has(p.customer.id) || !type) continue;
    const { ticket } = await createTicket({ eventId: ev.id, ticketTypeId: type.id, name: p.customer.name, phone: p.customer.phone, free: true });
    const msg = await generateInviteMessage(p.customer.name, WEEKDAYS[p.favoriteWeekday ?? 5], p.usualTable, ev.name);
    const { sent, link } = await sendWhatsApp(p.customer.phone, `${msg} ${appUrl}/ingresso/${ticket.id}`);
    await saveInvite({ customer_id: p.customer.id, event_id: ev.id, ticket_id: ticket.id, reason: p.action ?? "VIP", status: "sent" });
    invited.push({ customer: p.customer.name, ticketId: ticket.id, message: msg, sent, link });
  }
  return { event: ev.name, invited };
}
