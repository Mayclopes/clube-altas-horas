import { buscarCliente } from "@/lib/clientes";
import Link from "next/link";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

export default async function ClienteAdmin({
  params,
}: Props) {

  const { codigo } = await params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <h1 className="text-4xl font-bold text-red-600">
          Cliente não encontrado
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="max-w-xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          {cliente.nome}
        </h1>

        <div className="bg-zinc-900 rounded-xl p-6 mt-8 space-y-4">

          <p><strong>Código:</strong> {cliente.codigo}</p>

          <p><strong>WhatsApp:</strong> {cliente.whatsapp}</p>

          <p><strong>Nascimento:</strong> {cliente.nascimento}</p>

          <p><strong>Compras:</strong> {cliente.compras}</p>

          <p><strong>Pontos:</strong> ⭐ {cliente.pontos}</p>

        </div>

        <div className="grid gap-4 mt-8">

          <Link
            href={`/cliente/${cliente.codigo}`}
            className="bg-red-600 rounded-xl py-4 text-center"
          >
            Abrir cartão do cliente
          </Link>

          <Link
            href={`/cliente/${cliente.codigo}/historico`}
            className="bg-zinc-900 border border-zinc-700 rounded-xl py-4 text-center"
          >
            Ver histórico
          </Link>

          <Link
            href="/admin"
            className="bg-zinc-800 rounded-xl py-4 text-center"
          >
            Voltar
          </Link>

        </div>

      </div>

    </main>
  );

}