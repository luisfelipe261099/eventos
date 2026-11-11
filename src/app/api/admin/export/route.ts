import { fail, guardAdmin, handle } from "@/lib/http";
import { financeReport, toCsv } from "@/lib/finance";

const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Exportações: vendas, comandas, comissões (CSV para Excel) e backup completo (JSON). */
export const GET = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const type = new URL(req.url).searchParams.get("tipo");
  const { rows, byPromoter, raw } = await financeReport();
  const day = new Date().toISOString().slice(0, 10);
  const file = (name: string, content: string, mime = "text/csv; charset=utf-8") =>
    new Response(content, { headers: { "Content-Type": mime, "Content-Disposition": `attachment; filename="vipflow-${name}-${day}.${mime.startsWith("text/csv") ? "csv" : "json"}"` } });

  if (type === "resumo") return file("resumo", toCsv(["Evento", "Data", "Ingressos vendidos", "Receita ingressos", "Estornos", "Entraram", "Bar pago", "Bar em aberto", "Comissões", "Taxa VipFlow"],
    rows.map((r) => [r.event.name, dt(r.event.starts_at), r.ticketsSold, money(r.ticketRevenue), money(r.refunded), r.inside, money(r.barPaid), money(r.barOpen), money(r.commission), money(r.fees)])));
  if (type === "ingressos") {
    const cust = new Map(raw.customers.map((c) => [c.id, c])); const ev = new Map(raw.events.map((e) => [e.id, e.name])); const tt = new Map(raw.types.map((t) => [t.id, t.name]));
    return file("ingressos", toCsv(["Data da compra", "Evento", "Lote", "Cliente", "WhatsApp", "Valor", "Taxa VipFlow", "Situação", "Cobrança Asaas"],
      raw.tickets.map((t) => [dt(t.created_at), ev.get(t.event_id), tt.get(t.ticket_type_id), cust.get(t.customer_id)?.name, cust.get(t.customer_id)?.phone, money(t.price_cents), money(t.fee_cents ?? 0), t.status, t.payment_id ?? ""])));
  }
  if (type === "consumo") {
    const prod = new Map(raw.products.map((p) => [p.id, p.name])); const tab = new Map(raw.tabs.map((t) => [t.id, t])); const ev = new Map(raw.events.map((e) => [e.id, e.name]));
    return file("consumo", toCsv(["Data", "Evento", "Mesa", "Produto", "Qtd", "Valor unit.", "Total", "Status do pedido", "Comanda"],
      raw.items.map((i) => [dt(i.created_at), ev.get(i.event_id), tab.get(i.tab_id)?.table_label, prod.get(i.product_id), i.qty, money(i.unit_price_cents), money(i.qty * i.unit_price_cents), i.status, tab.get(i.tab_id)?.status])));
  }
  if (type === "comissoes") return file("comissoes", toCsv(["Promoter", "WhatsApp", "Convidados na lista", "Entraram", "Comissão por convidado", "Total a pagar"],
    byPromoter.map((p) => [p.promoter.name, p.promoter.phone, p.total, p.inside, money(p.promoter.commission_cents), money(p.dueCents)])));
  if (type === "backup") return file("backup", JSON.stringify({ exportedAt: new Date().toISOString(), ...raw }, null, 1), "application/json");
  return fail("Tipo de exportação inválido.");
});
