import { getVenueOrNull } from "@/lib/repo";
import { Page, TopBar } from "@/components/ui";
import AdminNav from "../AdminNav";
import VenueForm from "./VenueForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Casa e mesas" };

export default async function CasaAdmin() {
  const v = await getVenueOrNull();
  return (
    <Page wide>
      <TopBar title="Casa e mesas" sub="Endereço, área de check-in e QR das mesas" back="/" />
      <AdminNav active="/admin/casa" />
      <VenueForm initial={v ? { name: v.name, city: v.city, address: v.address ?? "", lat: v.lat, lng: v.lng, geofence_m: v.geofence_m, slug: v.slug } : null} />
    </Page>
  );
}
