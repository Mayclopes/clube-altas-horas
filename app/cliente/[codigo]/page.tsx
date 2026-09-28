import { sql } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

type ClienteV2 = {
  codigo: string;
  nome: string;
  pontos: number;
  compras: number;
  ativo: boolean;
  foto_url: string | null;
};

export const dynamic = "force-dynamic";

export default async function Cliente({
  params,
}: Props) {
  const { codigo } = await params;

  const codigoNormalizado =
    codigo.trim().toUpperCase();

  const resultado = await sql`
    SELECT
      codigo,
      nome,
      pontos,
      compras,
      ativo,
      foto_url
    FROM clientes_v2
    WHERE codigo = ${codigoNormalizado}
    LIMIT 1
  `;

  if (resultado.length === 0) {
    notFound();
  }

  const cliente =
    resultado[0] as ClienteV2;

  if (!cliente.ativo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">
            Cadastro indisponível
          </h1>

          <p className="mt-4 text-zinc-400">
            Este cadastro está inativo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600">
            Clube Altas Horas
          </h1>

          <p className="mt-4 text-zinc-400">
            Programa de Fidelidade
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-red-700 bg-black">
              {cliente.foto_url ? (
                <img
                  src={cliente.foto_url}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>

            <p className="mt-5 text-zinc-400">
              Bem-vindo ao Clube
            </p>

            <h2 className="mt-2 break-words text-3xl font-bold">
              {cliente.nome}
            </h2>

            <p className="mt-2 text-zinc-500">
              Código: {cliente.codigo}
            </p>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-zinc-400">
              Pontos
            </p>

            <p className="mt-2 text-4xl font-bold text-red-500">
              {cliente.pontos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-zinc-400">
              Compras
            </p>

            <p className="mt-2 text-4xl font-bold">
              {cliente.compras}
            </p>
          </div>
        </div>

        <Link
          href={`/cliente/${cliente.codigo}/historico`}
          className="mt-5 block rounded-xl border border-zinc-700 bg-zinc-900 py-4 text-center font-bold transition hover:border-red-600"
        >
          📜 Ver histórico
        </Link>

        <Link
          href="/"
          className="mt-4 block rounded-xl bg-red-600 py-4 text-center font-bold transition hover:bg-red-700"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}