"use client";

import { useState } from "react";
import clientes from "@/data/clientes.json";
import Link from "next/link";

export default function Buscar() {

  const [texto, setTexto] = useState("");

  const filtrados = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().includes(texto.toLowerCase()) ||
    cliente.codigo.toLowerCase().includes(texto.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-5xl font-bold text-red-600">
        Buscar Cliente
      </h1>

      <input
        className="w-full mt-8 bg-zinc-900 rounded-xl p-4 outline-none"
        placeholder="Nome ou código..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className="space-y-4 mt-8">

        {filtrados.map((cliente) => (

          <Link
            key={cliente.codigo}
            href={`/admin/cliente/${cliente.codigo}`}
            className="block bg-zinc-900 rounded-xl p-5 hover:border-red-600 border border-zinc-700"
          >

            <h2 className="text-2xl font-bold">
              {cliente.nome}
            </h2>

            <p>{cliente.codigo}</p>

          </Link>

        ))}

      </div>

    </main>
  );
}