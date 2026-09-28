"use client";

import type { Produto } from "@/types/produto";
import { useEffect, useState } from "react";

export default function Produtos() {
  const [listaProdutos, setListaProdutos] =
    useState<Produto[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState<string | null>(null);

  const [mensagem, setMensagem] =
    useState("");

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const resposta = await fetch(
          "/api/produtos-v2"
        );

        if (!resposta.ok) {
          throw new Error(
            "Erro ao buscar produtos."
          );
        }

        const dados =
          await resposta.json();

        setListaProdutos(dados);
      } catch {
        setMensagem(
          "Não foi possível carregar os produtos."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarProdutos();
  }, []);

  function alterarNome(
    id: string,
    nome: string
  ) {
    setListaProdutos(
      (produtosAtuais) =>
        produtosAtuais.map(
          (produto) =>
            produto.id === id
              ? {
                  ...produto,
                  nome,
                }
              : produto
        )
    );
  }

  function alterarPontos(
    id: string,
    pontos: string
  ) {
    const novoValor = Number(pontos);

    if (
      novoValor < 0 ||
      Number.isNaN(novoValor)
    ) {
      return;
    }

    setListaProdutos(
      (produtosAtuais) =>
        produtosAtuais.map(
          (produto) =>
            produto.id === id
              ? {
                  ...produto,
                  pontos: novoValor,
                }
              : produto
        )
    );
  }

  function alternarProduto(id: string) {
    setListaProdutos(
      (produtosAtuais) =>
        produtosAtuais.map(
          (produto) =>
            produto.id === id
              ? {
                  ...produto,
                  ativo: !produto.ativo,
                }
              : produto
        )
    );
  }

  async function salvarProduto(
    produto: Produto
  ) {
    if (!produto.nome.trim()) {
      setMensagem(
        "Digite um nome para o produto."
      );

      return;
    }

    setSalvando(produto.id);
    setMensagem("");

    try {
      const resposta = await fetch(
        "/api/produtos-v2",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: produto.id,
            nome: produto.nome,
            pontos: produto.pontos,
            ativo: produto.ativo,
          }),
        }
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
            "Não foi possível salvar."
        );
      }

      setListaProdutos(
        (produtosAtuais) =>
          produtosAtuais.map(
            (item) =>
              item.id === produto.id
                ? dados.produto
                : item
          )
      );

      setMensagem(
        "Produto salvo com sucesso."
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Erro ao salvar produto."
      );
    } finally {
      setSalvando(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          Produtos V2
        </h1>

        <p className="mt-4 text-zinc-400">
          Configure o nome, os pontos e o
          status dos produtos.
        </p>

        {mensagem && (
          <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-green-400 font-bold">
            {mensagem}
          </div>
        )}

        {carregando ? (
          <p className="mt-10 text-zinc-400">
            Carregando produtos...
          </p>
        ) : (
          <div className="grid gap-5 mt-10">

            {listaProdutos.map(
              (produto) => (
                <div
                  key={produto.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6"
                >

                  <div className="flex items-start justify-between gap-6">

                    <div className="flex-1">

                      <p className="text-sm text-zinc-500">
                        {produto.id}
                      </p>

                      <label className="block text-sm text-zinc-400 mt-4 mb-2">
                        Nome do produto
                      </label>

                      <input
                        type="text"
                        value={produto.nome}
                        onChange={(e) =>
                          alterarNome(
                            produto.id,
                            e.target.value
                          )
                        }
                        className="w-full bg-black border border-zinc-600 rounded-xl px-4 py-3 text-xl font-bold outline-none focus:border-red-600"
                      />

                      <p className="text-zinc-400 mt-3">
                        {produto.descricao}
                      </p>

                    </div>

                    <div className="text-right">

                      <label className="block text-sm text-zinc-400 mb-2">
                        Pontos
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={produto.pontos}
                        onChange={(e) =>
                          alterarPontos(
                            produto.id,
                            e.target.value
                          )
                        }
                        className="w-28 bg-black border border-zinc-600 rounded-xl px-4 py-3 text-center text-2xl font-bold outline-none focus:border-red-600"
                      />

                    </div>

                  </div>

                  <div className="flex items-center justify-between mt-6 gap-4">

                    <button
                      onClick={() =>
                        alternarProduto(
                          produto.id
                        )
                      }
                      className={
                        produto.ativo
                          ? "text-green-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {produto.ativo
                        ? "● Ativo"
                        : "● Inativo"}
                    </button>

                    <button
                      onClick={() =>
                        salvarProduto(
                          produto
                        )
                      }
                      disabled={
                        salvando ===
                        produto.id
                      }
                      className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 px-6 py-3 rounded-xl font-bold transition"
                    >
                      {salvando ===
                      produto.id
                        ? "Salvando..."
                        : "Salvar alterações"}
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </div>
    </main>
  );
}