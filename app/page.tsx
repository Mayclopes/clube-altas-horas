import Link from "next/link";

export default function Home() {

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-6xl font-bold text-red-600">
          Clube Altas Horas
        </h1>

        <p className="text-gray-400 mt-6">
          Programa de Fidelidade
        </p>

        <div className="mt-10">

          <Link
            href="/admin"
            className="bg-red-600 hover:bg-red-700 rounded-xl px-10 py-5 inline-block font-bold transition"
          >
            Entrar no Painel
          </Link>

        </div>

      </div>

    </main>

  );

}
<a
  href="/sobre"
  className="mt-6 block bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-xl text-center"
>
  Sobre o Projeto
</a>