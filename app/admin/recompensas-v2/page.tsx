"use client";

import type { RecompensaV2 } from "@/types/recompensa-v2";
import { useEffect, useState } from "react";

export default function RecompensasV2() {
  const [
    listaRecompensas,
    setListaRecompensas,
  ] = useState<RecompensaV2[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState<string | null>(null);

  const [mensagem, setMensagem] =
    useState("");

  useEffect(() => {
    async function carregarRecompensas() {
      try {
        const resposta = await fetch(
          "/api/recompensas-v2"
        );

        if (!resposta.ok) {
          throw new Error(
            "Erro ao buscar recompensas."
          );
        }

        const dados =
          await resposta.json();

        setListaRecompensas(dados);
      } catch {
        setMensagem(
          "Não foi possível carregar as recompensas."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarRecompensas();
  }, []);

  function alterarNome(
    id: string,
    nome: string
  ) {
    setListaRecompensas(
      (recompensasAtuais) =>
        recompensasAtuais.map(
          (recompensa) =>
            recompensa.id === id
              ? {
                  ...recompensa,
                  nome,
                }
              : recompensa
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

    setListaRecompensas(
      (recompensasAtuais) =>
        recompensasAtuais.map(
          (recompensa) =>
            recompensa.id === id
              ? {
                  ...recompensa,
                  pontos: novoValor,
                }
              : recompensa
        )
    );
  }

  function alternarRecompensa(
    id: string
  ) {
    setListaRecompensas(
      (recompensasAtuais) =>
        recompensasAtuais.map(
          (recompensa) =>
            recompensa.id === id
              ? {
                  ...recompensa,
                  ativo:
                    !recompensa.ativo,
                }
              : recompensa
        )
    );
  }

  async function salvarRecompensa(
    recompensa: RecompensaV2
  ) {
    if (!recompensa.nome.trim()) {
      setMensagem(
        "Digite um nome para a recompensa."
      );

      return;
    }

    setSalvando(recompensa.id);
    setMensagem("");

    try {
      const resposta = await fetch(
        "/api/recompensas-v2",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: recompensa.id,
            nome: recompensa.nome,
            pontos: recompensa.pontos,
            ativo: recompensa.ativo,
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

      setListaRecompensas(
        (recompensasAtuais) =>
          recompensasAtuais.map(
            (item) =>
              item.id === recompensa.id
                ? dados.recompensa
                : item
          )
      );

      setMensagem(
        "Recompensa salva com sucesso."
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Erro ao salvar recompensa."
      );
    } finally {
      setSalvando(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold text-red-600">
          Recompensas V2
        </h1>

        <p className="mt-4 text-zinc-400">
          Configure o nome, os pontos e o
          status das recompensas do Clube
          Altas Horas.
        </p>

        {mensagem && (
          <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-green-400 font-bold">
            {mensagem}
          </div>
        )}

        {carregando ? (
          <p className="mt-10 text-zinc-400">
            Carregando recompensas...
          </p>
        ) : (
          <div className="grid gap-5 mt-10">

            {listaRecompensas.map(
              (recompensa) => (
                <div
                  key={recompensa.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6"
                >

                  <div className="flex items-start justify-between gap-6">

                    <div className="flex-1">

                      <p className="text-sm text-zinc-500">
                        {recompensa.id}
                      </p>

                      <label className="block text-sm text-zinc-400 mt-4 mb-2">
                        Nome da recompensa
                      </label>

                      <input
                        type="text"
                        value={
                          recompensa.nome
                        }
                        onChange={(e) =>
                          alterarNome(
                            recompensa.id,
                            e.target.value
                          )
                        }
                        className="w-full bg-black border border-zinc-600 rounded-xl px-4 py-3 text-xl font-bold outline-none focus:border-red-600"
                      />

                      <p className="text-zinc-400 mt-3">
                        {
                          recompensa.descricao
                        }
                      </p>

                    </div>

                    <div className="text-right">

                      <label className="block text-sm text-zinc-400 mb-2">
                        Pontos necessários
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          recompensa.pontos
                        }
                        onChange={(e) =>
                          alterarPontos(
                            recompensa.id,
                            e.target.value
                          )
                        }
                        className="w-32 bg-black border border-zinc-600 rounded-xl px-4 py-3 text-center text-2xl font-bold outline-none focus:border-red-600"
                      />

                    </div>

                  </div>

                  <div className="flex items-center justify-between mt-6 gap-4">

                    <button
                      onClick={() =>
                        alternarRecompensa(
                          recompensa.id
                        )
                      }
                      className={
                        recompensa.ativo
                          ? "text-green-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {recompensa.ativo
                        ? "● Ativa"
                        : "● Inativa"}
                    </button>

                    <button
                      onClick={() =>
                        salvarRecompensa(
                          recompensa
                        )
                      }
                      disabled={
                        salvando ===
                        recompensa.id
                      }
                      className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 px-6 py-3 rounded-xl font-bold transition"
                    >
                      {salvando ===
                      recompensa.id
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