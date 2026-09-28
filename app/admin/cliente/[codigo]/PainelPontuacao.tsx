"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Produto = {
  id: string;
  nome: string;
  descricao: string;
  pontos: number;
  ativo: boolean;
};

type Props = {
  codigo: string;
  nomeCliente: string;
  pontosAtuais: number;
  produtos: Produto[];
};

export default function PainelPontuacao({
  codigo,
  nomeCliente,
  pontosAtuais,
  produtos,
}: Props) {
  const router = useRouter();

  const [produtoSelecionado, setProdutoSelecionado] =
    useState<Produto | null>(null);

  const [carregando, setCarregando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  async function registrarCompra() {
    if (!produtoSelecionado) {
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(
        "/api/compras-v2",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials:
            "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            codigo,
            produtoId:
              produtoSelecionado.id,
            quantidade: 1,
          }),
        }
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        setErro(
          dados.erro ||
            "Não foi possível registrar a compra."
        );

        return;
      }

      setMensagem(
        `+${dados.compra.pontosGanhos} pontos adicionados. Novo saldo: ${dados.compra.saldoNovo}.`
      );

      setProdutoSelecionado(null);

      router.refresh();
    } catch (erro) {
      console.error(
        "Erro ao registrar compra:",
        erro
      );

      setErro(
        "Não foi possível registrar a compra."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <section className="mt-8">

        <h2 className="text-2xl font-bold">
          Pontuar compra
        </h2>

        <p className="text-zinc-400 mt-2">
          Toque no produto comprado.
        </p>

        {produtos.length === 0 ? (
          <div className="mt-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400">
              Nenhum produto ativo.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 mt-5">

            {produtos.map(
              (produto) => (
                <button
                  key={produto.id}
                  type="button"
                  disabled={carregando}
                  onClick={() => {
                    setMensagem("");
                    setErro("");
                    setProdutoSelecionado(
                      produto
                    );
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 hover:border-red-600 rounded-2xl p-5 text-left transition disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <h3 className="text-xl font-bold">
                        {produto.nome}
                      </h3>

                      {produto.descricao && (
                        <p className="text-zinc-500 mt-1">
                          {
                            produto.descricao
                          }
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-red-500 text-xl font-bold">
                        +{produto.pontos}
                      </p>

                      <p className="text-zinc-500 text-sm">
                        pontos
                      </p>
                    </div>

                  </div>
                </button>
              )
            )}

          </div>
        )}

      </section>

      {mensagem && (
        <div className="mt-5 bg-green-950 border border-green-800 text-green-300 rounded-xl p-4">
          ✅ {mensagem}
        </div>
      )}

      {erro && (
        <div className="mt-5 bg-red-950 border border-red-800 text-red-300 rounded-xl p-4">
          {erro}
        </div>
      )}

      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">

          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6">

            <p className="text-zinc-400">
              Confirmar pontuação
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {nomeCliente}
            </h2>

            <div className="mt-6 bg-black rounded-xl p-5">

              <p className="text-xl font-bold">
                {produtoSelecionado.nome}
              </p>

              <p className="text-red-500 text-3xl font-bold mt-3">
                +{produtoSelecionado.pontos} pontos
              </p>

              <div className="mt-5 text-zinc-400">
                <p>
                  Saldo atual:
                  {" "}
                  {pontosAtuais}
                </p>

                <p>
                  Novo saldo:
                  {" "}
                  {pontosAtuais +
                    produtoSelecionado.pontos}
                </p>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">

              <button
                type="button"
                disabled={carregando}
                onClick={() =>
                  setProdutoSelecionado(
                    null
                  )
                }
                className="bg-zinc-800 rounded-xl py-4 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={carregando}
                onClick={
                  registrarCompra
                }
                className="bg-red-600 hover:bg-red-700 rounded-xl py-4 font-bold disabled:opacity-50"
              >
                {carregando
                  ? "Registrando..."
                  : "Confirmar"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}