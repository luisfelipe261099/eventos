import { ClientShell, Footer } from "@/components/client";
import Account from "./Account";

export const metadata = { title: "Minha conta" };

export default function ContaPage() {
  return (
    <ClientShell back="/">
      <Account />
      <Footer />
    </ClientShell>
  );
}
