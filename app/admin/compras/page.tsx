"use client";

import { useState } from "react";

type Cliente = {
  codigo: string;
  nome: string;
  pontos: number;
  compras: number;
};

export default function Compras() {
  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [mensagem, setMensagem] = useState("");

  async function buscarCliente() {
    setMensagem("");

    const resposta = await fetch("/api/clientes");
    const clientes = await resposta.json();

    const encontrado = clientes.find(
      (c: Cliente) => c.codigo === codigo
    );

    if (!encontrado) {
      setCliente(null);
      setMensagem("Cliente não encontrado.");
      return;
    }

    setCliente(encontrado);
  }

  async function registrarCompra() {
    const resposta = await fetch("/api/compras", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo,
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      setMensagem(dados.erro);
      return;
    }

    setMensagem("Compra registrada com sucesso!");

    setCliente({
      ...cliente!,
      compras: dados.compras,
      pontos: dados.pontos,
    });
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        <h1 className="text-5xl font-bold text-red-600 text-center">
          Registrar Compra
        </h1>

        <input
          className="w-full mt-10 bg-zinc-900 border border-zinc-700 rounded-xl p-4"
          placeholder="AH000001"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />

        <button
          onClick={buscarCliente}
          className="w-full mt-4 bg-zinc-800 rounded-xl py-4"
        >
          Buscar Cliente
        </button>

        {cliente && (

          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-5">

            <h2 className="text-2xl font-bold">
              {cliente.nome}
            </h2>

            <p className="mt-3">
              Compras: {cliente.compras}
            </p>

            <p>
              Pontos: ⭐ {cliente.pontos}
            </p>

            <button
              onClick={registrarCompra}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 rounded-xl py-4 font-bold"
            >
              Confirmar Compra
            </button>

          </div>

        )}

        {mensagem && (
          <p className="mt-6 text-center text-green-400">
            {mensagem}
          </p>
        )}

      </div>

    </main>
  );
}