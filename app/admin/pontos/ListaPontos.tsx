"use client";

import Link from "next/link";
import { useState } from "react";

type ClientePontos = {
  codigo: string; nome: string; pontos: number; compras: number; recompensas: number;
};

export default function ListaPontos({ clientes }: { clientes: ClientePontos[] }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const filtrados = clientes.filter((c) =>
    c.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
    c.codigo.toLocaleLowerCase("pt-BR").includes(termo)
  );

  return (
    <section className="mt-8">
      <label htmlFor="busca-pontos" className="mb-2 block text-zinc-300">Buscar por nome ou código</label>
      <input id="busca-pontos" type="search" value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 outline-none focus:border-red-500"
        placeholder="Nome ou código..." />
      <p className="mt-3 text-sm text-zinc-400">{filtrados.length} cliente(s) encontrado(s)</p>
      {filtrados.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          {clientes.length === 0 ? "Nenhum cliente ativo cadastrado." : "Nenhum cliente corresponde à busca."}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtrados.map((c) => (
            <Link key={c.codigo} href={`/admin/cliente/${encodeURIComponent(c.codigo)}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-red-500">
              <h2 className="break-words text-xl font-bold">{c.nome}</h2>
              <p className="mt-1 text-sm text-zinc-400">{c.codigo}</p>
              <p className="mt-4 text-2xl font-bold text-red-400">{c.pontos.toLocaleString("pt-BR")} pontos disponíveis</p>
              <p className="mt-3 text-zinc-300">{c.compras.toLocaleString("pt-BR")} compras registradas</p>
              <p className="mt-2 text-zinc-300">{c.recompensas} recompensa(s) disponível(is) para resgate</p>
              <p className="mt-4 text-sm text-red-400">Abrir atendimento →</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
