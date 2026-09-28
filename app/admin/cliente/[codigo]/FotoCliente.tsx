"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  codigo: string;
  fotoInicial: string | null;
};

export default function FotoCliente({
  codigo,
  fotoInicial,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState(fotoInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function enviar() {
    if (!arquivo || enviando) return;

    setEnviando(true);
    setMensagem("");
    setErro("");

    try {
      const formulario = new FormData();

      formulario.append("codigo", codigo);
      formulario.append("foto", arquivo);

      const resposta = await fetch("/api/foto-cliente", {
        method: "POST",
        body: formulario,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ?? "Erro ao enviar fotografia."
        );
      }

      setFoto(dados.foto_url);
      setArquivo(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setMensagem("Fotografia salva com sucesso.");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    if (!foto || enviando) return;

    const confirmado = window.confirm(
      "Deseja remover a fotografia deste cliente?"
    );

    if (!confirmado) return;

    setEnviando(true);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch("/api/foto-cliente", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ codigo }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ?? "Erro ao remover fotografia."
        );
      }

      setFoto(null);
      setArquivo(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setMensagem("Fotografia removida.");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold">
        Fotografia do cliente
      </h2>

      <p className="mt-2 text-sm text-zinc-400">
        Adicione uma foto para facilitar o reconhecimento.
      </p>

      <div className="mt-5 flex justify-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-red-600 bg-black">
          {foto ? (
            <img
              src={foto}
              alt="Fotografia do cliente"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl">👤</span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={enviando}
        onChange={(event) => {
          setArquivo(event.target.files?.[0] ?? null);
          setMensagem("");
          setErro("");
        }}
        className="mt-6 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-700 file:px-4 file:py-3 file:font-bold file:text-white"
      />

      <p className="mt-2 text-xs text-zinc-500">
        JPG, PNG ou WebP. Tamanho máximo: 2 MB.
      </p>

      {erro && (
        <p className="mt-4 rounded-xl bg-red-950 p-3 text-red-300">
          {erro}
        </p>
      )}

      {mensagem && (
        <p className="mt-4 rounded-xl bg-green-950 p-3 text-green-300">
          {mensagem}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={!arquivo || enviando}
        className="mt-5 w-full rounded-xl bg-red-600 p-4 font-bold disabled:opacity-40"
      >
        {enviando ? "Aguarde..." : "Salvar fotografia"}
      </button>

      {foto && (
        <button
          type="button"
          onClick={remover}
          disabled={enviando}
          className="mt-3 w-full rounded-xl border border-red-800 p-4 font-bold text-red-400 disabled:opacity-40"
        >
          Remover fotografia
        </button>
      )}
    </section>
  );
}