import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center"><h1 className="h-display text-3xl">Não encontrado</h1><Link className="btn" href="/">Voltar ao início</Link></main>;
}
