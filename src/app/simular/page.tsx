import { currentEvent, getTicketTypes, getVenue } from "@/lib/repo";
import { isSupabaseConfigured } from "@/lib/db";
import { AppBar } from "@/components/client";
import Simulator from "./Simulator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulador" };

export default async function SimularPage() {
  const [ev, venue] = await Promise.all([currentEvent(), getVenue()]);
  const types = ev ? await getTicketTypes(ev.id) : [];
  const pista = types.sort((a, b) => a.price_cents - b.price_cents)[0];
  return (
    <>
      <AppBar back="/" />
      {ev && pista ? (
        <Simulator eventId={ev.id} eventSlug={ev.slug} eventName={ev.name} ticketTypeId={pista.id} ticketPrice={pista.price_cents} venueSlug={venue.slug} live={isSupabaseConfigured()} />
      ) : (
        <p className="p-8 text-center text-nevoa">Cadastre um evento para usar o simulador.</p>
      )}
    </>
  );
}
