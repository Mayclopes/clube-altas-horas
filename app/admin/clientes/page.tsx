import { sql } from "@/lib/db";
import Link from "next/link";
import ListaClientes from "./ListaClientes";

type ClienteV2 = {
  codigo: string;
  nome: string;
  whatsapp: string;
  pontos: number;
  compras: number;
  ativo: boolean;
};

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const resultado = await sql`
    SELECT
      codigo,
      nome,
      whatsapp,
      pontos,
      compras,
      ativo
    FROM clientes_v2
    ORDER BY nome ASC
  `;

  const clientes =
    resultado as ClienteV2[];

  const ativos =
    clientes.filter(
      (cliente) => cliente.ativo
    ).length;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">

      <div className="max-w-3xl mx-auto">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-red-500 font-bold">
              Administração
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Clientes
            </h1>

            <p className="text-zinc-400 mt-3">
              Localize um cliente e abra
              o atendimento.
            </p>

          </div>

          <Link
            href="/admin"
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
          >
            Voltar
          </Link>

        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

            <p className="text-zinc-400">
              Total
            </p>

            <p className="text-3xl font-bold mt-2">
              {clientes.length}
            </p>

          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

            <p className="text-zinc-400">
              Ativos
            </p>

            <p className="text-3xl font-bold text-red-500 mt-2">
              {ativos}
            </p>

          </div>

        </div>

        <ListaClientes
          clientes={clientes}
        />

      </div>

    </main>
  );
}