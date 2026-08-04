"use client";

import Link from "next/link";
import clientes from "@/data/clientes.json";

export default function Admin() {

  const ultimos = [...clientes]
    .sort((a, b) => b.compras - a.compras)
    .slice(0, 5);

  function sair() {
    localStorage.removeItem("admin-logado");
    window.location.href = "/login";
  }

  return (

    <main className="min-h-screen bg-black text-white p-8">

      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-5xl font-bold text-red-600">
            Painel Administrativo
          </h1>

          <p className="mt-3 text-gray-400">
            Clube Altas Horas
          </p>

        </div>

        <button
          onClick={sair}
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold transition"
        >
          Sair
        </button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">

        <Link href="/admin/compras" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Registrar Compra
        </Link>

        <Link href="/admin/clientes" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Clientes
        </Link>

        <Link href="/admin/buscar" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Buscar Cliente
        </Link>

        <Link href="/admin/recompensas" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Recompensas
        </Link>

        <Link href="/admin/ranking" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Ranking
        </Link>

        <Link href="/admin/estatisticas" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Estatísticas
        </Link>

        <Link href="/status" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Status
        </Link>

        <Link href="/admin/health" className="bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600">
          Health Check
        </Link>

      </div>

      <h2 className="text-3xl font-bold mt-14">
        Clientes mais ativos
      </h2>

      <div className="space-y-3 mt-6">

        {ultimos.map((cliente) => (

          <div
            key={cliente.codigo}
            className="bg-zinc-900 rounded-xl p-4"
          >

            <strong>{cliente.nome}</strong>

            <p className="text-gray-400">
              {cliente.compras} compras
            </p>

          </div>

        ))}

      </div>

    </main>

  );

}