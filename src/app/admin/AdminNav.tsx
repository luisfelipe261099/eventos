import Link from "next/link";

const ITEMS = [
  ["/admin", "Ao vivo"], ["/admin/eventos", "Eventos"], ["/admin/cardapio", "Cardápio"],
  ["/admin/promoters", "Promoters"], ["/admin/financeiro", "Financeiro"], ["/admin/casa", "Casa e mesas"], ["/admin/setup", "Configuração"],
] as const;

export default function AdminNav({ active }: { active: string }) {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 pb-3 text-sm" aria-label="Seções do painel">
      {ITEMS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active === href ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 ${active === href ? "bg-white text-[#0a142b] font-semibold" : "text-mut hover:bg-white/5 hover:text-white"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
