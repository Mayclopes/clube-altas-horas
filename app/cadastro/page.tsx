"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Cadastro() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codigo = (
    searchParams.get("codigo") ?? ""
  )
    .trim()
    .toUpperCase();

  const [nome, setNome] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [nascimento, setNascimento] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [carregando, setCarregando] =
    useState(false);

  async function cadastrar() {
    setErro("");

    if (!codigo) {
      setErro(
        "Não foi possível identificar o código do chaveiro."
      );
      return;
    }

    if (!nome.trim()) {
      setErro(
        "Digite seu nome."
      );
      return;
    }

    if (!whatsapp.trim()) {
      setErro(
        "Digite seu WhatsApp."
      );
      return;
    }

    if (carregando) {
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(
        "/api/clientes-v2",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          credentials:
            "same-origin",
          body: JSON.stringify({
            codigo,
            nome: nome.trim(),
            whatsapp:
              whatsapp.trim(),
            nascimento:
              nascimento || null,
          }),
        }
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        setErro(
          dados.erro ||
            "Não foi possível realizar o cadastro."
        );
        return;
      }

      router.push(
        `/cliente/${codigo}`
      );
    } catch (erro) {
      console.error(
        "Erro no cadastro:",
        erro
      );

      setErro(
        "Não foi possível conectar ao Clube. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
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

        <div className="mt-8 space-y-5">

          <div>
            <label
              htmlFor="nome"
              className="block mb-2"
            >
              Nome
            </label>

            <input
              id="nome"
              type="text"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(evento) =>
                setNome(
                  evento.target.value
                )
              }
              disabled={carregando}
              autoComplete="name"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none focus:border-red-600 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="whatsapp"
              className="block mb-2"
            >
              WhatsApp
            </label>

            <input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(evento) =>
                setWhatsapp(
                  evento.target.value
                )
              }
              disabled={carregando}
              autoComplete="tel"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none focus:border-red-600 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="nascimento"
              className="block mb-2"
            >
              Data de nascimento
            </label>

            <input
              id="nascimento"
              type="date"
              value={nascimento}
              onChange={(evento) =>
                setNascimento(
                  evento.target.value
                )
              }
              disabled={carregando}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 outline-none focus:border-red-600 disabled:opacity-50"
            />
          </div>

          {erro && (
            <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-4">
              {erro}
            </div>
          )}

          <button
            type="button"
            onClick={cadastrar}
            disabled={
              carregando ||
              !nome.trim() ||
              !whatsapp.trim()
            }
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-400 transition rounded-xl py-4 text-lg font-bold"
          >
            {carregando
              ? "Entrando..."
              : "Entrar para o Clube"}
          </button>

        </div>

      </div>
    </main>
  );
}