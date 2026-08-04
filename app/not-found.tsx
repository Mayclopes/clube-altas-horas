import Link from "next/link";

export default function NotFound() {

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-7xl font-bold text-red-600">
          404
        </h1>

        <p className="text-2xl mt-6">
          Página não encontrada
        </p>

        <Link
          href="/"
          className="inline-block mt-10 bg-red-600 hover:bg-red-700 rounded-xl px-8 py-4 font-bold transition"
        >
          Voltar ao início
        </Link>

      </div>

    </main>

  );

}