"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

type Cliente = {
  codigo: string;
  nome: string;
  whatsapp: string;
  pontos: number;
  compras: number;
  ativo: boolean;
};

type Props = {
  clientes: Cliente[];
};

export default function ListaClientes({
  clientes,
}: Props) {
  const [busca, setBusca] =
    useState("");

  const clientesFiltrados =
    useMemo(() => {
      const termo = busca
        .trim()
        .toLowerCase();

      const numeros = termo.replace(
        /\D/g,
        ""
      );

      if (!termo) {
        return clientes;
      }

      return clientes.filter(
        (cliente) => {
          const nome = cliente.nome
            .toLowerCase();

          const codigo = cliente.codigo
            .toLowerCase();

          const telefone =
            cliente.whatsapp.replace(
              /\D/g,
              ""
            );

          return (
            nome.includes(termo) ||
            codigo.includes(termo) ||
            (
              numeros.length > 0 &&
              telefone.includes(numeros)
            )
          );
        }
      );
    }, [busca, clientes]);

  return (
    <>
      <div className="mt-6">

        <label
          htmlFor="busca-cliente"
          className="mb-2 block text-zinc-400"
        >
          Buscar cliente
        </label>

        <input
          id="busca-cliente"
          type="search"
          autoComplete="off"
          value={busca}
          onChange={(event) =>
            setBusca(
              event.target.value
            )
          }
          placeholder="Nome, código ou WhatsApp..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 outline-none transition focus:border-red-600"
        />

      </div>

      <p className="mt-4 text-sm text-zinc-500">
        {clientesFiltrados.length}{" "}
        {clientesFiltrados.length === 1
          ? "cliente encontrado"
          : "clientes encontrados"}
      </p>

      {clientesFiltrados.length === 0 ? (

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">

          <p className="text-4xl">
            🔎
          </p>

          <h2 className="mt-4 text-xl font-bold">
            Cliente não encontrado
          </h2>

          <p className="mt-2 text-zinc-400">
            Tente pesquisar pelo nome,
            código ou telefone.
          </p>

        </div>

      ) : (

        <div className="mt-5 space-y-4">

          {clientesFiltrados.map(
            (cliente) => (

              <div
                key={cliente.codigo}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
              >

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-xl font-bold">
                        {cliente.nome}
                      </h2>

                      {!cliente.ativo && (
                        <span className="rounded-full border border-red-900 bg-red-950 px-2 py-1 text-xs text-red-400">
                          Inativo
                        </span>
                      )}

                    </div>

                    <p className="mt-2 text-zinc-500">
                      🔑 {cliente.codigo}
                    </p>

                    <p className="mt-1 text-zinc-500">
                      📱 {cliente.whatsapp}
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-black p-4 text-center">

                    <p className="text-sm text-zinc-500">
                      Pontos
                    </p>

                    <p className="mt-1 text-xl font-bold text-red-500">
                      ⭐ {cliente.pontos}
                    </p>

                  </div>

                  <div className="rounded-xl bg-black p-4 text-center">

                    <p className="text-sm text-zinc-500">
                      Compras
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      🛒 {cliente.compras}
                    </p>

                  </div>

                </div>

                <div className="mt-4 grid gap-3">

                  <Link
                    href={`/admin/cliente/${cliente.codigo}`}
                    className="rounded-xl bg-red-600 py-4 text-center font-bold transition hover:bg-red-700"
                  >
                    Atender cliente
                  </Link>

                  {cliente.ativo && (
                    <Link
                      href={`/admin/resgatar?codigo=${encodeURIComponent(
                        cliente.codigo
                      )}`}
                      className="rounded-xl bg-green-700 py-4 text-center font-bold transition hover:bg-green-600"
                    >
                      🎁 Resgatar recompensa
                    </Link>
                  )}

                </div>

              </div>
            )
          )}

        </div>
      )}

    </>
  );
}