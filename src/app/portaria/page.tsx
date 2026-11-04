import { Page, TopBar } from "@/components/ui";
import SWRegister from "@/components/SWRegister";
import Door from "./Door";

export const metadata = { title: "Portaria" };

export default function PortariaPage() {
  return (
    <Page>
      <SWRegister />
      <TopBar title="Portaria" sub="Leitor de ingressos" back="/" />
      <Door />
    </Page>
  );
}
