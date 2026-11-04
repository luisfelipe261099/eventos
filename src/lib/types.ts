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
}

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
}

export type TicketStatus = "pending" | "paid" | "used" | "cancelled";

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
  is_free?: boolean;
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
