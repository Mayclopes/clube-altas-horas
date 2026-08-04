"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Cadastro() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codigo = searchParams.get("codigo") ?? "";

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nascimento, setNascimento] = useState("");

  function cadastrar() {
    if (!nome || !whatsapp) {
      alert("Preencha todos os campos.");
      return;
    }

    localStorage.setItem(
      codigo,
      JSON.stringify({
        codigo,
        nome,
        whatsapp,
        nascimento,
        pontos: 0,
        compras: 0,
      })
    );

    router.push(`/cliente/${codigo}`);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <h1 className="text-5xl font-bold text-red-600 text-center">
          Clube Altas Horas
        </h1>

        <p className="text-center mt-6 text-gray-400">
          Falta só um passo para entrar no Clube.
        </p>

        <div className="mt-8 bg-zinc-900 rounded-2xl p-5 border border-zinc-700">
          <p className="text-gray-500 text-center">
            Seu chaveiro foi identificado
          </p>

          <p className="text-center text-3xl font-bold text-red-500 mt-2">
            {codigo || "Sem código"}
          </p>
        </div>

        <form className="mt-8 space-y-5">

          <div>
            <label className="block mb-2">
              Nome
            </label>

            <input
              type="text"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none"
            />
          </div>

          <div>
            <label className="block mb-2">
              WhatsApp
            </label>

            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none"
            />
          </div>

          <div>
            <label className="block mb-2">
              Data de nascimento
            </label>

            <input
              type="date"
              value={nascimento}
              onChange={(e) => setNascimento(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={cadastrar}
            className="w-full bg-red-600 hover:bg-red-700 transition rounded-xl py-4 text-lg font-bold"
          >
            Entrar para o Clube
          </button>

        </form>

      </div>
    </main>
  );
}