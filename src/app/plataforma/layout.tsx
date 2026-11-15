import type { Metadata } from "next";
import { isRoot } from "@/lib/admin-auth";
import Login from "../admin/Login";
import PlatformNav from "./PlatformNav";
import { BrandMark } from "@/components/Brand";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

/** Área do administrador da plataforma: tudo que é da Casa Cheia, separado do painel das casas. */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!(await isRoot())) return <Login />;
  return (
    <div className="op">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <BrandMark size={30} />
          <div className="min-w-0 flex-1">
            <div className="h-display text-lg leading-none">Casa Cheia</div>
            <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-brandl">Administração da plataforma</div>
          </div>
          <form action="/api/admin/logout" method="post"><button className="rounded-full px-3 py-1.5 text-sm text-mut hover:bg-white/5 hover:text-white">Sair</button></form>
        </div>
        <PlatformNav />
      </header>
      <main className="mx-auto min-h-dvh max-w-6xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}
