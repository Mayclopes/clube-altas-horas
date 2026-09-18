import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export default function Estatisticas() {
  const listaClientes = clientes as Cliente[];

  const totalClientes = listaClientes.length;

  const totalCompras = listaClientes.reduce(
    (total, cliente) => total + cliente.compras,
    0
  );

  const totalPontos = listaClientes.reduce(
    (total, cliente) => total + cliente.pontos,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold text-red-600">
        Estatísticas
      </h1>

      <div className="grid gap-6 mt-10">

        <div className="bg-zinc-900 rounded-xl p-6">
          <p>Total de Clientes</p>

          <h2 className="text-4xl font-bold mt-2">
            {totalClientes}
          </h2>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <p>Total de Compras</p>

          <h2 className="text-4xl font-bold mt-2">
            {totalCompras}
          </h2>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <p>Total de Pontos</p>

          <h2 className="text-4xl font-bold mt-2">
            {totalPontos}
          </h2>
        </div>

      </div>
    </main>
  );
}