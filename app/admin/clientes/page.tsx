import Link from "next/link";
import clientes from "@/data/clientes.json";

export default function Clientes() {
  return (
    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-5xl font-bold text-red-600">
        Clientes
      </h1>

      <div className="space-y-4 mt-10">

        {clientes.map((cliente) => (

          <Link
            key={cliente.codigo}
            href={`/admin/cliente/${cliente.codigo}`}
            className="block bg-zinc-900 rounded-xl p-5 border border-zinc-700 hover:border-red-600 transition"
          >

            <h2 className="text-2xl font-bold">
              {cliente.nome}
            </h2>

            <p className="text-gray-400">
              {cliente.codigo}
            </p>

            <p className="mt-2">
              ⭐ {cliente.pontos} pontos
            </p>

          </Link>

        ))}

      </div>

    </main>
  );
}