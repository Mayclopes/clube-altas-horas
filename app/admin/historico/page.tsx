import { buscarCliente } from "@/lib/clientes";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

export default async function Historico({ params }: Props) {
  const { codigo } = await params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Cliente não encontrado
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-4xl font-bold text-red-600">
        Histórico de Compras
      </h1>

      <p className="text-gray-400 mt-2">
        {cliente.nome}
      </p>

      <div className="mt-10 space-y-4">

        {cliente.historico.length === 0 ? (

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            Nenhuma compra registrada.
          </div>

        ) : (

          cliente.historico.map((item, index) => (

            <div
              key={index}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-5"
            >
              <p>
                Data:
                {" "}
                {item.data}
              </p>

              <p className="mt-2">
                Pontos:
                {" "}
                ⭐ {item.pontos}
              </p>

            </div>

          ))

        )}

      </div>

    </main>
  );
}