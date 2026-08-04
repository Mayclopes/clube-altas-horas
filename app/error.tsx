"use client";

export default function Error({

  reset,

}: {

  error: Error;

  reset: () => void;

}) {

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-5xl text-red-600 font-bold">

          Ocorreu um erro

        </h1>

        <button

          onClick={reset}

          className="mt-10 bg-red-600 hover:bg-red-700 rounded-xl px-8 py-4"

        >

          Tentar novamente

        </button>

      </div>

    </main>

  );

}