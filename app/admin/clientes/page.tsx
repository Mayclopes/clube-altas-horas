"use client";

import Link from "next/link";
import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export default function Clientes() {
  const listaClientes = clientes as Cliente[];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold text-red-600">
        Clientes
      </h1>

      <p className="mt-4 text-zinc-400">
        Lista de clientes cadastrados no Clube Altas Horas.
      </p>

      <div className="space-y-4 mt-10">
        {listaClientes.map((cliente) => (
          <Link
            key={cliente.codigo}
            href={`/admin/cliente/${cliente.codigo}`}
            className="block bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600 transition"
          >
            <h2 className="text-2xl font-bold">
              {cliente.nome}
            </h2>

            <p className="text-zinc-400 mt-1">
              Código: {cliente.codigo}
            </p>

            <p className="mt-3">
              ⭐ {cliente.pontos} pontos
            </p>

            <p className="text-zinc-400">
              🛒 {cliente.compras} compras
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}