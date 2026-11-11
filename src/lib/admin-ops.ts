/** Cadastros do painel (eventos, lotes, cardápio, promoters, casa). */
import { db, hasSupabaseStorage, isSupabaseConfigured, uid } from "./db";
import type { EventItem, Product, Promoter, TicketType, Venue } from "./types";
import { getVenueOrNull } from "./repo";

const DENIED = "Este registro é de outra casa.";

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** "2026-11-06T23:00" no horário de Brasília → ISO UTC */
export const brLocalToIso = (local: string) => new Date(`${local.length === 16 ? local + ":00" : local}-03:00`).toISOString();
/** ISO → "2026-11-06T23:00" no horário de Brasília (para <input type=datetime-local>) */
export const isoToBrLocal = (iso: string) => new Date(new Date(iso).getTime() - 3 * 36e5).toISOString().slice(0, 16);

const code = () => { const b = new Uint8Array(6); crypto.getRandomValues(b); return Array.from(b, (x) => (x % 36).toString(36)).join("") + Math.random().toString(36).slice(2, 6); };
const int = (v: unknown, min = 0) => Math.max(min, Math.round(Number(v) || 0));

export async function saveVenue(input: Partial<Venue> & { name: string }) {
  const existing = await getVenueOrNull();
  if (!existing && isSupabaseConfigured()) {
    // casa nova só nasce pelo cadastro (/cadastro) ou pela VipFlow na primeira configuração
    const { isRoot } = await import("./admin-auth");
    if (!(await isRoot())) throw new Error("Faça login para editar a casa.");
  }
  const feeMode = input.fee_mode === "venue" || input.fee_mode === "buyer" ? { fee_mode: input.fee_mode } : {};
  const row = {
    name: input.name.trim(), city: (input.city ?? "").trim(), address: (input.address ?? "").trim(),
    lat: Number(input.lat) || 0, lng: Number(input.lng) || 0, geofence_m: int(input.geofence_m, 20) || 80, ...feeMode,
  };
  if (existing) return db().update<Venue>("venues", existing.id, row);
  const [v] = await db().insert<Venue>("venues", { id: uid(), slug: await freeVenueSlug(input.slug || input.name), ...row });
  return v;
}

/** Slug livre para uma casa nova (o slug vira o link do cardápio). */
export async function freeVenueSlug(name: string) {
  const base = slugify(name) || "minha-casa";
  const taken = new Set((await db().select<Venue>("venues")).map((v) => v.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export interface EventInput {
  id?: string; name: string; starts_local: string; category?: EventItem["category"]; description?: string;
  min_age?: number; capacity?: number; cover_url?: string | null;
  lots: { id?: string; name: string; price_cents: number; quantity: number }[];
}

export async function saveEvent(input: EventInput) {
  const venue = await getVenueOrNull();
  if (!venue) throw new Error("Cadastre a casa antes de criar eventos.");
  if (!input.name?.trim()) throw new Error("Dê um nome ao evento.");
  if (!input.starts_local) throw new Error("Informe data e horário.");
  const starts_at = brLocalToIso(input.starts_local);
  const fields = {
    name: input.name.trim(), starts_at, category: input.category ?? "Festas", description: input.description?.trim() || null,
    min_age: int(input.min_age ?? 18), capacity: int(input.capacity ?? 500, 1), cover_url: input.cover_url || null,
  };
  let ev: EventItem | null;
  if (input.id) {
    const cur = await db().get<EventItem>("events", input.id);
    if (!cur) throw new Error("Evento não encontrado.");
    if (cur.venue_id !== venue.id) throw new Error(DENIED);
    ev = await db().update<EventItem>("events", input.id, fields);
  } else {
    const all = await db().select<EventItem>("events");
    let slug = `${slugify(input.name)}-${starts_local_ddmm(input.starts_local)}`;
    if (all.some((e) => e.slug === slug)) slug = `${slug}-${all.length + 1}`;
    [ev] = await db().insert<EventItem>("events", { id: uid(), venue_id: venue.id, slug, cover_color: "#000000", ...fields });
  }
  const current = await db().select<TicketType>("ticket_types", { event_id: ev!.id });
  for (const lot of input.lots ?? []) {
    if (!lot.name?.trim()) continue;
    const data = { name: lot.name.trim(), price_cents: int(lot.price_cents), quantity: int(lot.quantity, 0) };
    const found = lot.id && current.find((c) => c.id === lot.id);
    if (found) {
      if (data.quantity < found.sold) throw new Error(`O lote "${found.name}" já vendeu ${found.sold}; a quantidade não pode ser menor.`);
      await db().update<TicketType>("ticket_types", found.id, data);
    } else await db().insert<TicketType>("ticket_types", { id: uid(), event_id: ev!.id, sold: 0, ...data });
  }
  return ev!;
}
const starts_local_ddmm = (l: string) => `${l.slice(8, 10)}-${l.slice(5, 7)}`;

export async function saveProduct(input: Partial<Product> & { name: string }) {
  const venue = await getVenueOrNull();
  if (!venue) throw new Error("Cadastre a casa primeiro.");
  if (!input.name?.trim()) throw new Error("Dê um nome ao produto.");
  const data = {
    name: input.name.trim(), category: input.category ?? "Drinks", price_cents: int(input.price_cents), cost_cents: int(input.cost_cents),
    stock: int(input.stock), active: input.active ?? true,
  };
  if (input.id) {
    const cur = await db().get<Product>("products", input.id);
    if (!cur || cur.venue_id !== venue.id) throw new Error(DENIED);
    return db().update<Product>("products", input.id, data);
  }
  const [p] = await db().insert<Product>("products", { id: uid(), venue_id: venue.id, promo_price_cents: null, promo_until: null, ...data });
  return p;
}

export async function savePromoter(input: Partial<Promoter> & { name: string }) {
  if (!input.name?.trim()) throw new Error("Informe o nome do promoter.");
  const data = { name: input.name.trim(), phone: (input.phone ?? "").trim(), commission_cents: int(input.commission_cents), active: input.active ?? true };
  const venue = await getVenueOrNull();
  if (!venue) throw new Error("Cadastre a casa primeiro.");
  if (input.id) {
    const cur = await db().get<Promoter>("promoters", input.id);
    if (!cur || (cur.venue_id ?? venue.id) !== venue.id) throw new Error(DENIED);
    return db().update<Promoter>("promoters", input.id, data);
  }
  const [p] = await db().insert<Promoter>("promoters", { id: uid(), venue_id: venue.id, access_code: isSupabaseConfigured() ? code() : undefined, ...data });
  if (!p.access_code) await db().update<Promoter>("promoters", p.id, { access_code: p.id });
  return p;
}

/**
 * Upload de flyer. Com Postgres: guarda no próprio banco (tabela media) e serve
 * em /api/media/ID com cache longo. Sem Postgres: Supabase Storage, se houver.
 */
export async function uploadFlyer(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Imagem muito grande (máximo 3 MB).");
  const { postgresUrl, pg } = await import("./db");
  if (postgresUrl()) {
    const id = uid();
    const bytes = Buffer.from(await file.arrayBuffer());
    await pg()`insert into media (id, mime, bytes, size) values (${id}, ${file.type}, ${bytes}, ${bytes.length})`;
    return `/api/media/${id}`;
  }
  if (!hasSupabaseStorage()) throw new Error("Upload disponível depois de conectar o banco. Por enquanto, cole a URL de uma imagem.");
  const { supabaseAdmin } = await import("./db");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${new Date().toISOString().slice(0, 7)}/${uid()}.${ext}`;
  const { error } = await supabaseAdmin().storage.from("flyers").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabaseAdmin().storage.from("flyers").getPublicUrl(path).data.publicUrl;
}
