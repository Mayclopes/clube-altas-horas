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
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Cliente não encontrado
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="max-w-xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          Histórico
        </h1>

        <p className="mt-3 text-gray-400">
          {cliente.nome}
        </p>

        <div className="space-y-4 mt-10">

          {cliente.historico.map((item, index) => (

            <div
              key={index}
              className="bg-zinc-900 rounded-xl p-5"
            >

              <p>
                📅 {new Date(item.data).toLocaleString("pt-BR")}
              </p>

              <p className="mt-2">
                ⭐ +{item.pontos} ponto
              </p>

            </div>

          ))}

        </div>

        <Link
          href={`/cliente/${cliente.codigo}`}
          className="block text-center mt-8 bg-red-600 rounded-xl py-4"
        >
          Voltar
        </Link>

      </div>

    </main>
  );
}