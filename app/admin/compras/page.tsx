import Link from "next/link";

export default function ComprasAntigas() {
  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="font-bold text-red-500">
            Clube Altas Horas
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Registro de compras
          </h1>

          <p className="mt-4 leading-7 text-zinc-400">
            O registro de compras agora é feito
            diretamente no atendimento do cliente.
          </p>

          <Link
            href="/admin/clientes"
            className="mt-6 block rounded-xl bg-red-600 px-4 py-4 text-center font-bold"
          >
            👥 Escolher cliente
          </Link>

          <Link
            href="/admin"
            className="mt-3 block rounded-xl border border-zinc-700 px-4 py-4 text-center"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </main>
  );
}