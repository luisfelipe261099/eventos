/** Componentes do app do cliente (tema claro, flyer em primeiro plano). */
import Link from "next/link";
import Image from "next/image";

const TZ = "America/Sao_Paulo";
export const dayNum = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });
export const monthShort = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "short", timeZone: TZ }).replace(".", "");
export const weekdayShort = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", timeZone: TZ }).replace(".", "");
export const longDate = (iso: string) => {
  const d = new Date(iso);
  const wd = d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: TZ });
  const dm = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: TZ });
  const t = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${dm}, às ${t}`;
};

const paths = {
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  ticket: "M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3v2zM14 6v12",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  back: "M15 18l-6-6 6-6",
  glass: "M6 3h12l-1 7a5 5 0 0 1-10 0L6 3zM12 15v6M8 21h8",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01",
  id: "M16 11a4 4 0 1 1-8 0M12 4v3M4 21l2-6M20 21l-2-6",
  check: "M5 12l5 5L20 7",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
};
export function Icon({ name, size = 20, className = "" }: { name: keyof typeof paths; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export function AppBar({ back }: { back?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-breu text-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        {back && <Link href={back} aria-label="Voltar" className="-ml-2 rounded-full p-2 hover:bg-white/10"><Icon name="back" size={22} /></Link>}
        <Link href="/" aria-label="VipFlow, início" className="flex items-center"><Image src="/logo.png" alt="VipFlow" width={118} height={32} priority /></Link>
        <Link href="/conta" className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
          <Icon name="user" size={18} /> Minha conta
        </Link>
      </div>
    </header>
  );
}

export function ClientShell({ children, back, bare = false }: { children: React.ReactNode; back?: string; bare?: boolean }) {
  return (
    <>
      <AppBar back={back} />
      <main className={bare ? "" : "mx-auto max-w-5xl px-4 pb-16"}>{children}</main>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-breu text-white">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <Image src="/logo.png" alt="VipFlow" width={130} height={35} loading="eager" />
          <p className="mt-4 max-w-xs text-sm text-white/60">Ingressos, cardápio digital e comandas para as melhores casas de Curitiba.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Para casas e produtores</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li><Link className="hover:text-white" href="/planos">Planos e preços</Link></li>
            <li><Link className="hover:text-white" href="/cadastro">Cadastrar minha casa</Link></li>
            <li><Link className="hover:text-white" href="/simular">Simulador</Link></li>
            <li><Link className="hover:text-white" href="/admin">Painel da casa</Link></li>
            <li><Link className="hover:text-white" href="/bar">Tela do bar</Link></li>
            <li><Link className="hover:text-white" href="/portaria">Portaria</Link></li>
            <li><Link className="hover:text-white" href="/promoter">App do promoter</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Ajuda</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li><Link className="hover:text-white" href="/cancelamento">Cancelamento e reembolso</Link></li>
            <li><Link className="hover:text-white" href="/termos">Termos de uso</Link></li>
            <li><Link className="hover:text-white" href="/privacidade">Política de privacidade</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} VipFlow</div>
    </footer>
  );
}

/** Selo de data sobre o flyer: o dia é a informação mais importante da vitrine. */
export function DateStamp({ iso, className = "" }: { iso: string; className?: string }) {
  return (
    <div className={`flex w-12 flex-col items-center rounded-xl bg-white py-1.5 text-tinta shadow-[0_2px_10px_rgba(0,0,0,.25)] ${className}`}>
      <span className="poster text-[26px] leading-none">{dayNum(iso)}</span>
      <span className="text-[11px] font-semibold text-nevoa">{monthShort(iso)}</span>
    </div>
  );
}

export function Flyer({ src, alt, sizes, priority = false, className = "" }: { src?: string | null; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-[#1a1820] ${className}`}>
      {src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" /> : <div className="poster absolute inset-0 flex items-end p-4 text-3xl text-white">{alt}</div>}
    </div>
  );
}
