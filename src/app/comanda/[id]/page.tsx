import { ClientShell } from "@/components/client";
import TabView from "./TabView";

export const metadata = { title: "Minha comanda" };

export default async function ComandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ClientShell back="/conta">
      <div className="mx-auto max-w-md pt-6"><TabView id={id} /></div>
    </ClientShell>
  );
}
