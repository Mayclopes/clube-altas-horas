import { sql } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

type ClienteV2 = {
  codigo: string;
  nome: string;
  pontos: number;
  compras: number;
  ativo: boolean;
};

type Movimentacao = {
  id: string;
  tipo: string;
  descricao: string;
  pontos: number;
  saldo_anterior: number;
  saldo_novo: number;
  quantidade: number | null;
  criado_em: string;
};

export const dynamic = "force-dynamic";

export default async function Historico({
  params,
}: Props) {
  const { codigo } = await params;

  const codigoNormalizado =
    codigo.trim().toUpperCase();

  const resultadoCliente = await sql`
    SELECT
      codigo,
      nome,
      pontos,
      compras,
      ativo
    FROM clientes_v2
    WHERE codigo = ${codigoNormalizado}
    LIMIT 1
  `;

  if (resultadoCliente.length === 0) {
    notFound();
  }

  const cliente =
    resultadoCliente[0] as ClienteV2;

  if (!cliente.ativo) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">
            Cadastro indisponível
          </h1>

          <p className="mt-4 text-zinc-400">
            Este cadastro está inativo.
          </p>
        </div>
      </main>
    );
  }

  const resultadoMovimentacoes = await sql`
    SELECT
      id,
      tipo,
      descricao,
      pontos,
      saldo_anterior,
      saldo_novo,
      quantidade,
      criado_em
    FROM movimentacoes_v2
    WHERE cliente_codigo = ${codigoNormalizado}
    ORDER BY criado_em DESC
    LIMIT 100
  `;

  const movimentacoes =
    resultadoMovimentacoes as Movimentacao[];

  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">

      <div className="max-w-xl mx-auto">

        <p className="text-red-500 font-bold">
          Clube Altas Horas
        </p>

        <h1 className="text-4xl font-bold mt-2">
          Histórico
        </h1>

        <p className="text-zinc-400 mt-2">
          {cliente.nome}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-7">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-zinc-400">
              Pontos
            </p>

            <p className="text-3xl font-bold text-red-500 mt-2">
              {cliente.pontos}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-zinc-400">
              Compras
            </p>

            <p className="text-3xl font-bold mt-2">
              {cliente.compras}
            </p>
          </div>

        </div>

        {movimentacoes.length === 0 ? (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">

            <p className="text-4xl">
              📜
            </p>

            <h2 className="text-xl font-bold mt-4">
              Nenhuma movimentação
            </h2>

            <p className="text-zinc-400 mt-2">
              Suas compras e pontos aparecerão aqui.
            </p>

          </div>
        ) : (
          <div className="space-y-4 mt-6">

            {movimentacoes.map(
              (movimentacao) => {
                const positivo =
                  movimentacao.pontos >= 0;

                return (
                  <div
                    key={movimentacao.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
                  >

                    <div className="flex justify-between gap-4">

                      <div>
                        <p className="text-red-500 text-sm font-bold">
                          {movimentacao.tipo}
                        </p>

                        <h2 className="font-bold mt-2">
                          {movimentacao.descricao}
                        </h2>
                      </div>

                      <div className="text-right shrink-0">

                        <p
                          className={`text-2xl font-bold ${
                            positivo
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {positivo ? "+" : ""}
                          {movimentacao.pontos}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          pontos
                        </p>

                      </div>

                    </div>

                    <div className="border-t border-zinc-800 mt-5 pt-4">

                      {movimentacao.quantidade !== null && (
                        <p className="text-zinc-400 text-sm">
                          Quantidade:{" "}
                          {movimentacao.quantidade}
                        </p>
                      )}

                      <p className="text-zinc-400 text-sm mt-2">
                        Saldo:{" "}
                        {movimentacao.saldo_anterior}
                        {" → "}
                        {movimentacao.saldo_novo}
                      </p>

                      <p className="text-zinc-500 text-sm mt-2">
                        {new Date(
                          movimentacao.criado_em
                        ).toLocaleString(
                          "pt-BR",
                          {
                            timeZone:
                              "America/Sao_Paulo",
                          }
                        )}
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

        <Link
          href={`/cliente/${cliente.codigo}`}
          className="block text-center mt-8 bg-red-600 hover:bg-red-700 rounded-xl py-4 font-bold transition"
        >
          Voltar
        </Link>

      </div>

    </main>
  );
}