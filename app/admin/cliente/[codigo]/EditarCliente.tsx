"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  codigo: string;
  nomeInicial: string;
  whatsappInicial: string;
  nascimentoInicial: string | null;
  ativoInicial: boolean;
  observacaoInicial: string | null;
};

export default function EditarCliente({
  codigo,
  nomeInicial,
  whatsappInicial,
  nascimentoInicial,
  ativoInicial,
  observacaoInicial,
}: Props) {
  const router = useRouter();

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(nomeInicial);
  const [whatsapp, setWhatsapp] =
    useState(whatsappInicial);
  const [nascimento, setNascimento] =
    useState(nascimentoInicial ?? "");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [observacao, setObservacao] =
    useState(observacaoInicial ?? "");
  const [salvando, setSalvando] =
    useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] =
    useState("");

  function restaurar() {
    setNome(nomeInicial);
    setWhatsapp(whatsappInicial);
    setNascimento(nascimentoInicial ?? "");
    setAtivo(ativoInicial);
    setObservacao(observacaoInicial ?? "");
    setErro("");
    setMensagem("");
  }

  async function salvar(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (salvando) return;

    setErro("");
    setMensagem("");

    if (!nome.trim() || !whatsapp.trim()) {
      setErro(
        "Nome e WhatsApp são obrigatórios."
      );
      return;
    }

    if (!ativo && !observacao.trim()) {
      setErro(
        "Informe o motivo da inativação."
      );
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        "/api/clientes-v2",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            codigo,
            nome: nome.trim(),
            whatsapp: whatsapp.trim(),
            nascimento: nascimento || null,
            ativo,
            observacao_inatividade:
              observacao.trim(),
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ??
          "Não foi possível salvar."
        );
      }

      setMensagem(
        "Alterações salvas com sucesso."
      );
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-bold hover:border-red-600"
      >
        ✏️ Editar dados do cliente
      </button>
    );
  }

  return (
    <form
      onSubmit={salvar}
      className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          Editar cliente
        </h2>

        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            restaurar();
            setAberto(false);
          }}
          className="text-zinc-400"
        >
          Fechar
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-zinc-400">
            Nome
          </span>
          <input
            required
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-zinc-400">
            WhatsApp
          </span>
          <input
            required
            value={whatsapp}
            onChange={(e) =>
              setWhatsapp(e.target.value)
            }
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-zinc-400">
            Data de nascimento
          </span>
          <input
            type="date"
            value={nascimento}
            onChange={(e) =>
              setNascimento(e.target.value)
            }
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-xl bg-black p-4">
          <span>
            <strong className="block">
              Cliente ativo
            </strong>
            <span className="text-sm text-zinc-400">
              Desmarque para inativar.
            </span>
          </span>

          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => {
              setAtivo(e.target.checked);
              setErro("");
            }}
            className="h-5 w-5"
          />
        </label>

        {!ativo && (
          <div>
            <label
              htmlFor="motivo-inatividade"
              className="mb-2 block font-bold"
            >
              Motivo da inativação *
            </label>

            <textarea
              id="motivo-inatividade"
              required
              maxLength={300}
              rows={4}
              value={observacao}
              onChange={(e) =>
                setObservacao(e.target.value)
              }
              placeholder="Descreva o motivo..."
              className="w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-red-600"
            />

            <p className="mt-1 text-right text-sm text-zinc-400">
              {observacao.length}/300 caracteres
            </p>
          </div>
        )}
      </div>

      {erro && (
        <p className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
          {erro}
        </p>
      )}

      {mensagem && (
        <p className="mt-5 rounded-xl border border-green-800 bg-green-950 p-4 text-green-300">
          {mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="mt-6 w-full rounded-xl bg-red-600 p-4 font-bold hover:bg-red-700 disabled:opacity-50"
      >
        {salvando
          ? "Salvando..."
          : "Salvar alterações"}
      </button>
    </form>
  );
}