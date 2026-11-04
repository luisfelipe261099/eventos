import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center"><h1 className="poster text-5xl uppercase">Página não encontrada</h1><p className="text-nevoa">O evento pode ter acabado ou o link está incompleto.</p><Link className="btn-primary" href="/">Ver eventos</Link></main>;
}
