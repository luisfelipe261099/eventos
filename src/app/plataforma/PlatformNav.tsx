"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/plataforma", "Visão geral"], ["/plataforma/casas", "Casas"], ["/plataforma/repasses", "Repasses"],
  ["/plataforma/contatos", "Contatos"], ["/plataforma/equipe", "Equipe"], ["/plataforma/sistema", "Sistema"],
] as const;

export default function PlatformNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 text-sm" aria-label="Administração">
      {ITEMS.map(([href, label]) => {
        const active = href === "/plataforma" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 ${active ? "bg-white font-semibold text-[#0a142b]" : "text-mut hover:bg-white/5 hover:text-white"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
