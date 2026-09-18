"use client";

import { useState } from "react";
import Link from "next/link";
import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export default function Admin() {
  const [menuAberto, setMenuAberto] = useState(false);

  const listaClientes = clientes as Cliente[];

  const ultimos = [...listaClientes]
    .sort((a, b) => b.compras - a.compras)
    .slice(0, 5);

  function sair() {
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-red-600">
              Clube Altas Horas
            </h1>

            <p className="mt-2 text-zinc-400">
              Painel Administrativo
            </p>
          </div>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold"
          >
            Menu
          </button>
        </div>

        {menuAberto && (
          <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
            <Link
              href="/admin/clientes"
              className="block hover:text-red-500"
            >
              👥 Clientes
            </Link>

            <Link
              href="/admin/buscar"
              className="block hover:text-red-500"
            >
              🔎 Buscar Cliente
            </Link>

            <Link
              href="/admin/compras"
              className="block hover:text-red-500"
            >
              🛒 Compras
            </Link>

            <Link
              href="/admin/pontos"
              className="block hover:text-red-500"
            >
              ⭐ Pontos
            </Link>

            <Link
              href="/admin/recompensas"
              className="block hover:text-red-500"
            >
              🎁 Recompensas
            </Link>

            <Link
              href="/admin/resgatar"
              className="block hover:text-red-500"
            >
              🎟️ Resgatar
            </Link>

            <Link
              href="/admin/ranking"
              className="block hover:text-red-500"
            >
              🏆 Ranking
            </Link>

            <Link
              href="/admin/estatisticas"
              className="block hover:text-red-500"
            >
              📊 Estatísticas
            </Link>

            <Link
              href="/admin/historico"
              className="block hover:text-red-500"
            >
              📜 Histórico
            </Link>

            <button
              onClick={sair}
              className="block w-full text-left hover:text-red-500"
            >
              🚪 Sair
            </button>
          </div>
        )}

        <section className="mt-12">
          <h2 className="text-3xl font-bold">
            Últimos clientes
          </h2>

          <div className="grid gap-4 mt-6">
            {ultimos.map((cliente) => (
              <Link
                key={cliente.codigo}
                href={`/admin/cliente/${cliente.codigo}`}
                className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 hover:border-red-600 transition"
              >
                <h3 className="text-2xl font-bold">
                  {cliente.nome}
                </h3>

                <p className="text-zinc-400 mt-1">
                  Código: {cliente.codigo}
                </p>

                <div className="flex gap-6 mt-4">
                  <span>
                    ⭐ {cliente.pontos} pontos
                  </span>

                  <span>
                    🛒 {cliente.compras} compras
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}