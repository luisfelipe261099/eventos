"use client";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const setup = /Configuração pendente|relation|does not exist|schema cache|venues/i.test(error.message);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="poster text-4xl uppercase">{setup ? "Configuração pendente" : "Algo deu errado"}</h1>
      <p className="text-nevoa">{setup ? "O banco ainda não está pronto. Termine a configuração no painel." : "Não conseguimos carregar esta página. Tente de novo em instantes."}</p>
      <div className="flex gap-2">
        {setup ? <Link className="btn-primary" href="/admin/setup">Ir para a configuração</Link> : <button className="btn-primary" onClick={reset}>Tentar de novo</button>}
        <Link className="btn-line" href="/">Início</Link>
      </div>
    </main>
  );
}
