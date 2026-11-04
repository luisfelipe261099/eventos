import { ClientShell, Footer } from "@/components/client";

export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <ClientShell back="/">
      <article className="mx-auto max-w-2xl py-8 leading-relaxed text-tinta/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="h-display text-[34px]">{title}</h1>
        <p className="text-sm text-nevoa">Última atualização: {updated}</p>
        {children}
      </article>
      <Footer />
    </ClientShell>
  );
}
