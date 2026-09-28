"use client";

import { useState } from "react";
import Link from "next/link";

type Cliente = {
  codigo: string;
  nome: string;
  pontos: number;
  compras: number;
};

type Props = {
  ultimosClientes: Cliente[];
};

export default function PainelAdmin({
  ultimosClientes,
}: Props) {
  const [menuAberto, setMenuAberto] =
    useState(false);

  const [saindo, setSaindo] =
    useState(false);

  async function sair() {
    if (saindo) {
      return;
    }

    setSaindo(true);

    try {
      const resposta = await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      if (!resposta.ok) {
        throw new Error(
          "Não foi possível encerrar a sessão."
        );
      }

      window.location.replace(
        "/login"
      );
    } catch (erro) {
      console.error(
        "Erro ao sair:",
        erro
      );

      setSaindo(false);

      alert(
        "Não foi possível sair. Tente novamente."
      );
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between gap-5">

          <div>

            <h1 className="text-5xl font-bold text-red-600">
              Clube Altas Horas
            </h1>

            <p className="mt-2 text-zinc-400">
              Painel Administrativo
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setMenuAberto(
                !menuAberto
              )
            }
            disabled={saindo}
            className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold disabled:opacity-50"
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
              👥 Clientes / Buscar
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
              href="/admin/produtos"
              className="block hover:text-red-500"
            >
              🛍️ Produtos
            </Link>

            <Link
              href="/admin/recompensas-v2"
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
              type="button"
              onClick={sair}
              disabled={saindo}
              className="block w-full text-left hover:text-red-500 disabled:text-zinc-600"
            >
              {saindo
                ? "🚪 Saindo..."
                : "🚪 Sair"}
            </button>

          </div>
        )}

        <section className="mt-12">

          <div className="flex items-center justify-between gap-4">

            <h2 className="text-3xl font-bold">
              Clientes recentes
            </h2>

            <Link
              href="/admin/clientes"
              className="text-red-500 hover:text-red-400"
            >
              Ver todos
            </Link>

          </div>

          {ultimosClientes.length ===
          0 ? (
            <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">

              <p className="text-zinc-400">
                Nenhum cliente cadastrado.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 mt-6">

              {ultimosClientes.map(
                (cliente) => (
                  <Link
                    key={cliente.codigo}
                    href={`/admin/cliente/${cliente.codigo}`}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 hover:border-red-600 transition"
                  >

                    <h3 className="text-2xl font-bold">
                      {cliente.nome}
                    </h3>

                    <p className="text-zinc-400 mt-1">
                      Código:{" "}
                      {cliente.codigo}
                    </p>

                    <div className="flex gap-6 mt-4 flex-wrap">

                      <span>
                        ⭐ {cliente.pontos} pontos
                      </span>

                      <span>
                        🛒 {cliente.compras} compras
                      </span>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}