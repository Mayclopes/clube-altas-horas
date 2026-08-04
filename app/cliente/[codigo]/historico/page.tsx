import { buscarCliente } from "@/lib/clientes";
import Link from "next/link";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

export default async function Historico({
  params,
}: Props) {

  const { codigo } = await params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {
    return <h1>Cliente não encontrado.</h1>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="max-w-2xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          Histórico
        </h1>

        <p className="text-gray-400 mt-2">
          {cliente.nome}
        </p>

        <div className="space-y-4 mt-10">

          {cliente.historico
            .slice()
            .reverse()
            .map((item, index) => (

              <div
                key={index}
                className="bg-zinc-900 rounded-xl p-5 border border-zinc-700"
              >

                <p>
                  Data:
                </p>

                <strong>
                  {new Date(item.data).toLocaleString("pt-BR")}
                </strong>

                <p className="mt-3">
                  Pontos ganhos:
                </p>

                <strong>
                  +{item.pontos}
                </strong>

              </div>

          ))}

        </div>

        <Link
          href={`/cliente/${codigo}`}
          className="block mt-8 text-center bg-red-600 rounded-xl py-4"
        >
          Voltar
        </Link>

      </div>

    </main>
  );

}