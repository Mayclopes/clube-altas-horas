"use client";

import {
  useEffect,
  useRef,
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

type Recompensa = {
  id: string;
  nome: string;
  descricao: string;
  pontos: number;
  ativo: boolean;
};

export default function Resgatar() {
  const [busca, setBusca] = useState("");

  const [resultados, setResultados] =
    useState<Cliente[]>([]);

  const [cliente, setCliente] =
    useState<Cliente | null>(null);

  const [recompensas, setRecompensas] =
    useState<Recompensa[]>([]);

  const [selecionada, setSelecionada] =
    useState<Recompensa | null>(null);

  const [pesquisando, setPesquisando] =
    useState(false);

  const [carregando, setCarregando] =
    useState(false);

  const [resgatando, setResgatando] =
    useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] =
    useState("");

  const pesquisaAtual = useRef(0);
  const clienteAtual = useRef(0);

  // Carrega o cliente escolhido e
  // as recompensas disponíveis.

  async function selecionarCliente(
    codigo: string
  ) {
    const operacao = ++clienteAtual.current;

    pesquisaAtual.current++;

    setPesquisando(false);
    setResultados([]);
    setCliente(null);
    setRecompensas([]);
    setSelecionada(null);
    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const resposta = await fetch(
        `/api/resgates-v2?codigo=${encodeURIComponent(
          codigo
        )}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ??
            "Não foi possível carregar o cliente."
        );
      }

      if (
        operacao !== clienteAtual.current
      ) {
        return;
      }

      setCliente(dados.cliente);
      setRecompensas(
        dados.recompensas
      );

      setBusca("");
    } catch (error) {
      if (
        operacao !== clienteAtual.current
      ) {
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar cliente."
      );
    } finally {
      if (
        operacao === clienteAtual.current
      ) {
        setCarregando(false);
      }
    }
  }

  // Mantém o acesso automático
  // quando o cliente chega pelo NFC.

  useEffect(() => {
    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const codigo = parametros
      .get("codigo")
      ?.trim()
      .toUpperCase();

    if (
      codigo &&
      /^AH\d{6}$/.test(codigo)
    ) {
      void selecionarCliente(codigo);
    }

    return () => {
      clienteAtual.current++;
      pesquisaAtual.current++;
    };
  }, []);

  // Pesquisa no Neon com uma pequena
  // espera para evitar consultas
  // a cada tecla digitada.

  useEffect(() => {
    if (
      cliente ||
      carregando ||
      resgatando
    ) {
      return;
    }

    const termo = busca.trim();
    const operacao =
      ++pesquisaAtual.current;

    if (termo.length < 2) {
      setResultados([]);
      setPesquisando(false);
      return;
    }

    const controlador =
      new AbortController();

    const temporizador = setTimeout(
      async () => {
        setPesquisando(true);
        setErro("");

        try {
          const resposta = await fetch(
            `/api/clientes-v2/buscar?q=${encodeURIComponent(
              termo
            )}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              signal: controlador.signal,
            }
          );

          const dados =
            await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.erro ??
                "Erro na pesquisa."
            );
          }

          if (
            operacao ===
            pesquisaAtual.current
          ) {
            setResultados(
              dados.clientes
            );
          }
        } catch (error) {
          if (
            controlador.signal.aborted ||
            operacao !==
              pesquisaAtual.current
          ) {
            return;
          }

          setErro(
            error instanceof Error
              ? error.message
              : "Erro na pesquisa."
          );
        } finally {
          if (
            operacao ===
            pesquisaAtual.current
          ) {
            setPesquisando(false);
          }
        }
      },
      350
    );

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [
    busca,
    cliente,
    carregando,
    resgatando,
  ]);

  // Confirma o resgate no servidor.

  async function confirmarResgate() {
    if (
      !cliente ||
      !selecionada ||
      resgatando
    ) {
      return;
    }

    setResgatando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(
        "/api/resgates-v2",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            codigo: cliente.codigo,
            recompensaId:
              selecionada.id,
          }),
        }
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ??
            "Não foi possível realizar o resgate."
        );
      }

      setCliente({
        ...cliente,
        pontos:
          dados.movimentacao.saldo_novo,
      });

      setMensagem(
        `${selecionada.nome} resgatada com sucesso!`
      );

      setSelecionada(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao realizar o resgate."
      );

      // Não repetir automaticamente:
      // conferir o histórico primeiro.

      setSelecionada(null);
      setCliente(null);
      setRecompensas([]);
    } finally {
      setResgatando(false);
    }
  }

  function novaPesquisa() {
    clienteAtual.current++;
    pesquisaAtual.current++;

    setCliente(null);
    setRecompensas([]);
    setResultados([]);
    setSelecionada(null);
    setBusca("");
    setErro("");
    setMensagem("");
    setCarregando(false);

    // Remove o código recebido pelo
    // NFC para permitir nova pesquisa.

    window.history.replaceState(
      null,
      "",
      "/admin/resgatar"
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-2xl">

        <Link
          href="/admin"
          className="text-zinc-400"
        >
          ← Voltar ao painel
        </Link>

        <h1 className="mt-6 text-4xl font-bold text-red-600">
          Resgatar recompensa
        </h1>

        <p className="mt-3 text-zinc-400">
          Pesquise por nome, código
          do chaveiro ou WhatsApp.
        </p>

        {/* PESQUISA */}

        {!cliente && !carregando && (
          <section className="mt-8">

            <label
              htmlFor="busca"
              className="mb-2 block text-zinc-400"
            >
              Buscar cliente
            </label>

            <input
              id="busca"
              autoComplete="off"
              value={busca}
              maxLength={100}
              onChange={(event) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Nome, telefone ou AH000001"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 outline-none focus:border-red-600"
            />

            {pesquisando && (
              <p className="mt-4 text-zinc-400">
                Pesquisando...
              </p>
            )}

            {!pesquisando &&
              busca.trim().length >= 2 && (
                <p className="mt-4 text-sm text-zinc-500">
                  {resultados.length}
                  {" "}
                  {resultados.length === 1
                    ? "cliente encontrado"
                    : "clientes encontrados"}
                </p>
              )}

            <div className="mt-4 space-y-3">

              {resultados.map(
                (resultado) => (
                  <button
                    key={resultado.codigo}
                    type="button"
                    onClick={() =>
                      selecionarCliente(
                        resultado.codigo
                      )
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-left transition hover:border-red-600"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="text-lg font-bold">
                          {resultado.nome}
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                          🔑 {resultado.codigo}
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                          📱 {resultado.whatsapp}
                        </p>
                      </div>

                      <span
                        className={
                          resultado.ativo
                            ? "text-sm text-green-400"
                            : "text-sm text-red-400"
                        }
                      >
                        {resultado.ativo
                          ? "Ativo"
                          : "Inativo"}
                      </span>

                    </div>

                    <p className="mt-3 font-bold text-red-400">
                      ⭐ {resultado.pontos} pontos
                    </p>

                    <p className="mt-3 text-center font-bold text-green-400">
                      Selecionar cliente →
                    </p>

                  </button>
                )
              )}

            </div>

          </section>
        )}

        {carregando && (
          <p className="mt-8 text-zinc-400">
            Carregando cliente...
          </p>
        )}

        {/* MENSAGENS */}

        {erro && (
          <div className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mt-5 rounded-xl border border-green-800 bg-green-950 p-4 text-green-300">
            {mensagem}
          </div>
        )}

        {/* CLIENTE SELECIONADO */}

        {cliente && (
          <>

            <section className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-900 p-5">

              <h2 className="text-2xl font-bold">
                {cliente.nome}
              </h2>

              <p className="mt-2 text-zinc-400">
                🔑 {cliente.codigo}
              </p>

              <p className="mt-4 text-3xl font-bold text-red-500">
                ⭐ {cliente.pontos} pontos
              </p>

              <p className="mt-2 text-zinc-400">
                {cliente.compras} compras
              </p>

              <p
                className={
                  cliente.ativo
                    ? "mt-3 text-green-400"
                    : "mt-3 text-red-400"
                }
              >
                {cliente.ativo
                  ? "● Cliente ativo"
                  : "● Cliente inativo"}
              </p>

              <div className="mt-5 grid gap-3">

                <Link
                  href={`/admin/cliente/${cliente.codigo}`}
                  className="rounded-xl bg-zinc-800 p-4 text-center font-bold"
                >
                  👤 Voltar ao atendimento
                </Link>

                <Link
                  href={`/cliente/${cliente.codigo}/historico`}
                  className="rounded-xl border border-zinc-700 p-4 text-center"
                >
                  📜 Ver histórico
                </Link>

                <button
                  type="button"
                  disabled={resgatando}
                  onClick={novaPesquisa}
                  className="rounded-xl border border-zinc-700 p-4 text-center disabled:opacity-50"
                >
                  🔎 Pesquisar outro cliente
                </button>

              </div>

            </section>

            {/* RECOMPENSAS */}

            {!cliente.ativo ? (
              <div className="mt-5 rounded-xl border border-red-900 bg-red-950 p-5">
                Cliente inativo.
                Não é possível realizar
                resgates.
              </div>
            ) : (
              <>

                <h2 className="mt-8 text-2xl font-bold">
                  Recompensas disponíveis
                </h2>

                {recompensas.length === 0 && (
                  <p className="mt-5 text-zinc-400">
                    Nenhuma recompensa ativa.
                  </p>
                )}

                <div className="mt-5 space-y-4">

                  {recompensas.map(
                    (recompensa) => {
                      const suficiente =
                        cliente.pontos >=
                        recompensa.pontos;

                      return (
                        <div
                          key={recompensa.id}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                        >

                          <h3 className="text-xl font-bold">
                            {recompensa.nome}
                          </h3>

                          {recompensa.descricao && (
                            <p className="mt-2 text-zinc-400">
                              {recompensa.descricao}
                            </p>
                          )}

                          <p className="mt-4 text-2xl font-bold text-red-500">
                            {recompensa.pontos} pontos
                          </p>

                          <button
                            type="button"
                            disabled={
                              !suficiente ||
                              resgatando
                            }
                            onClick={() =>
                              setSelecionada(
                                recompensa
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-red-600 p-4 font-bold disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                          >
                            {suficiente
                              ? "Selecionar recompensa"
                              : "Pontos insuficientes"}
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>

              </>
            )}

          </>
        )}

        {/* CONFIRMAÇÃO */}

        {selecionada && cliente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">

            <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">

              <h2 className="text-2xl font-bold">
                Confirmar resgate
              </h2>

              <p className="mt-4 text-zinc-400">
                Cliente
              </p>

              <p className="font-bold">
                {cliente.nome}
              </p>

              <p className="mt-5 text-zinc-400">
                Recompensa
              </p>

              <p className="font-bold">
                {selecionada.nome}
              </p>

              <div className="mt-5 space-y-2 rounded-xl bg-black p-4">

                <p>
                  Saldo atual:{" "}
                  {cliente.pontos}
                </p>

                <p>
                  Custo:{" "}
                  {selecionada.pontos}
                </p>

                <p className="font-bold text-green-400">
                  Saldo previsto:{" "}
                  {cliente.pontos -
                    selecionada.pontos}
                </p>

              </div>

              <button
                type="button"
                disabled={resgatando}
                onClick={confirmarResgate}
                className="mt-6 w-full rounded-xl bg-red-600 p-4 font-bold disabled:opacity-50"
              >
                {resgatando
                  ? "Registrando..."
                  : "Confirmar resgate"}
              </button>

              <button
                type="button"
                disabled={resgatando}
                onClick={() =>
                  setSelecionada(null)
                }
                className="mt-3 w-full rounded-xl bg-zinc-700 p-4 disabled:opacity-50"
              >
                Cancelar
              </button>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}