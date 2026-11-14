export type ID = string;

export interface Venue {
  id: ID;
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** raio (m) usado para validar check-in de promoters por geolocalização */
  geofence_m: number;
  address?: string;
  // --- conta da casa (SaaS) ---
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  doc?: string | null;
  password_hash?: string | null;
  plan?: string | null;
  fee_mode?: "buyer" | "venue" | null;
  plan_status?: "trial" | "active" | "past_due" | "blocked" | null;
  trial_ends_at?: string | null;
  asaas_key_enc?: string | null;
  /** preenchido nas leituras públicas no lugar da chave */
  has_asaas?: boolean;
  billing_customer_id?: string | null;
  billing_subscription_id?: string | null;
  /** chave Pix para receber os repasses (recebimento pela conta da plataforma) */
  pix_key?: string | null;
  pix_key_type?: PixKeyType | null;
  payout_auto?: boolean;
  created_at?: string;
}

export interface Lead { id: ID; name: string; venue_name: string; phone: string; city: string; plan: string; created_at: string }

export interface EventItem {
  id: ID;
  venue_id: ID;
  slug: string;
  name: string;
  starts_at: string; // ISO
  capacity: number;
  cover_color: string;
  /** flyer do evento (proporção 4:5). Em produção: Supabase Storage. */
  cover_url?: string | null;
  category?: "Festas" | "Shows" | "Barzinho";
  description?: string | null;
  min_age?: number;
}

export interface TicketType {
  id: ID;
  event_id: ID;
  name: string;
  price_cents: number;
  quantity: number;
  sold: number;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  cpf?: string | null;
  asaas_id?: string | null;
}

export type TicketStatus = "pending" | "paid" | "used" | "cancelled" | "refunded";

export interface Ticket {
  id: ID;
  event_id: ID;
  ticket_type_id: ID;
  customer_id: ID;
  promoter_id?: ID | null;
  status: TicketStatus;
  /** semente secreta do QR dinâmico (HMAC). Só o dono e a portaria conhecem. */
  qr_seed: string;
  price_cents: number;
  /** taxa da Casa Cheia neste ingresso (0 em ingresso grátis) */
  fee_cents?: number;
  /** true quando a taxa já foi repassada à Casa Cheia pelo split do Asaas */
  fee_split?: boolean;
  is_free?: boolean;
  payment_id?: string | null;
  refunded_at?: string | null;
  created_at: string;
}

export interface Checkin {
  id: ID;
  ticket_id: ID;
  event_id: ID;
  gate: string;
  at: string;
  offline: boolean;
}

export interface Promoter {
  id: ID;
  name: string;
  phone: string;
  venue_id?: ID | null;
  commission_cents: number; // por convidado validado
  /** código do link individual do promoter (/promoter?k=...) */
  access_code?: string;
  active?: boolean;
}

export interface GuestListEntry {
  id: ID;
  event_id: ID;
  promoter_id: ID;
  customer_id: ID;
  status: "pending" | "on_the_way" | "inside";
  validated_at?: string | null;
}

export interface Product {
  id: ID;
  venue_id: ID;
  name: string;
  category: "Drinks" | "Cervejas" | "Combos" | "Petiscos" | "Garrafas";
  price_cents: number;
  cost_cents: number;
  stock: number;
  active: boolean;
  promo_price_cents?: number | null;
  promo_until?: string | null;
}

export type OrderStatus = "queued" | "preparing" | "ready" | "delivered" | "cancelled";

export interface Tab {
  id: ID; // comanda
  event_id: ID;
  customer_id: ID;
  table_label: string;
  status: "open" | "paid";
  opened_at: string;
  payment_id?: string | null;
}

export interface OrderItem {
  id: ID;
  tab_id: ID;
  event_id: ID;
  product_id: ID;
  qty: number;
  unit_price_cents: number;
  status: OrderStatus;
  created_at: string;
}

export interface Invite {
  id: ID;
  customer_id: ID;
  event_id: ID;
  ticket_id: ID;
  reason: string;
  status: "sent" | "accepted" | "ignored";
  created_at: string;
}

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export interface LedgerEntry {
  id: ID;
  venue_id: ID;
  kind: "sale_ticket" | "sale_tab" | "refund" | "adjust";
  ref: string;
  gross_cents: number;
  asaas_fee_cents: number;
  platform_fee_cents: number;
  amount_cents: number;
  note?: string | null;
  created_at: string;
}

export interface Payout {
  id: ID;
  venue_id: ID;
  value_cents: number;
  pix_key: string;
  pix_key_type: PixKeyType;
  transfer_id?: string | null;
  status: "requested" | "awaiting_authorization" | "pending" | "done" | "failed" | "cancelled";
  fee_cents: number;
  fail_reason?: string | null;
  auto: boolean;
  created_at: string;
  updated_at: string;
}
