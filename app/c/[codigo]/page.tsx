import { buscarCliente } from "@/lib/clientes";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

export default async function Pagina({ params }: Props) {

  const { codigo } = await params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-5xl font-bold text-red-600">
          Clube Altas Horas
        </h1>

        <p className="mt-8 text-2xl">
          Olá,
        </p>

        <h2 className="text-4xl font-bold mt-2">
          {cliente.nome}
        </h2>

        <p className="mt-10 text-xl">
          ⭐ {cliente.pontos} pontos
        </p>

      </div>

    </main>
  );
}