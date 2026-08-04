"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Resgatar() {

  const [codigo, setCodigo] = useState("");

  const router = useRouter();

  function buscar() {

    if (!codigo) return;

    router.push(`/admin/cliente/${codigo}`);

  }

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="w-full max-w-md">

        <h1 className="text-5xl font-bold text-red-600 text-center">
          Resgatar Recompensa
        </h1>

        <input
          className="w-full mt-10 bg-zinc-900 border border-zinc-700 rounded-xl p-4"
          placeholder="AH000001"
          value={codigo}
          onChange={(e)=>setCodigo(e.target.value)}
        />

        <button
          onClick={buscar}
          className="w-full mt-6 bg-red-600 rounded-xl py-4"
        >
          Buscar Cliente
        </button>

      </div>

    </main>

  );

}