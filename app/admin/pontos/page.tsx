"use client";

import Link from "next/link";
import clientes from "@/data/clientes.json";
import recompensas from "@/data/recompensas.json";
import type { Cliente } from "@/types/cliente";

export default function Pontos() {
  const listaClientes = clientes as Cliente[];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          Pontos
        </h1>

        <p className="mt-4 text-zinc-400">
          Consulte os pontos dos clientes e as recompensas disponíveis.
        </p>

        <div className="space-y-6 mt-10">
          {listaClientes.map((cliente) => {
            const disponiveis = recompensas.filter(
              (recompensa) => cliente.pontos >= recompensa.pontos
            );

            return (
              <Link
                key={cliente.codigo}
                href={`/admin/cliente/${cliente.codigo}`}
                className="block bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-red-600 transition"
              >
                <h2 className="text-2xl font-bold">
                  {cliente.nome}
                </h2>

                <p className="text-zinc-400 mt-1">
                  Código: {cliente.codigo}
                </p>

                <p className="text-xl mt-4">
                  ⭐ {cliente.pontos} pontos
                </p>

                <p className="mt-3">
                  🎁 {disponiveis.length} recompensa
                  {disponiveis.length !== 1 ? "s" : ""} disponível
                  {disponiveis.length !== 1 ? "eis" : ""}
                </p>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}