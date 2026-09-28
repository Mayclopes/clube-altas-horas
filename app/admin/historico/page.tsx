import { sql } from "@/lib/db";
import Link from "next/link";

type Movimentacao = {
  id: string;
  cliente_codigo: string;
  cliente_nome: string;
  tipo: string;
  descricao: string;
  pontos: number;
  saldo_anterior: number;
  saldo_novo: number;
  produto_id: string | null;
  quantidade: number | null;
  criado_em: string;
};

export const dynamic = "force-dynamic";

export default async function Historico() {
  const resultado = await sql`
    SELECT
      m.id,
      m.cliente_codigo,
      c.nome AS cliente_nome,
      m.tipo,
      m.descricao,
      m.pontos,
      m.saldo_anterior,
      m.saldo_novo,
      m.produto_id,
      m.quantidade,
      m.criado_em
    FROM movimentacoes_v2 m
    INNER JOIN clientes_v2 c
      ON c.codigo = m.cliente_codigo
    ORDER BY m.criado_em DESC
    LIMIT 200
  `;

  const movimentacoes =
    resultado as Movimentacao[];

  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">

      <div className="max-w-4xl mx-auto">

        <div className="flex items-start justify-between gap-5">

          <div>
            <p className="text-red-500 font-bold">
              Administração
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Histórico
            </h1>

            <p className="text-zinc-400 mt-2">
              Movimentações do Clube Altas Horas
            </p>
          </div>

          <Link
            href="/admin"
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
          >
            Voltar
          </Link>

        </div>

        {movimentacoes.length === 0 ? (
          <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">

            <p className="text-4xl">
              📜
            </p>

            <h2 className="text-xl font-bold mt-4">
              Nenhuma movimentação
            </h2>

            <p className="text-zinc-400 mt-2">
              As compras, resgates, bônus e ajustes aparecerão aqui.
            </p>

          </div>
        ) : (
          <div className="space-y-4 mt-10">

            {movimentacoes.map(
              (movimentacao) => {

                const pontosPositivos =
                  movimentacao.pontos >= 0;

                return (
                  <div
                    key={movimentacao.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
                  >

                    <div className="flex justify-between gap-5">

                      <div>

                        <p className="text-sm text-red-500 font-bold">
                          {movimentacao.tipo}
                        </p>

                        <h2 className="text-xl font-bold mt-1">
                          {movimentacao.cliente_nome}
                        </h2>

                        <p className="text-zinc-500 text-sm mt-1">
                          {movimentacao.cliente_codigo}
                        </p>

                      </div>

                      <div className="text-right">

                        <p
                          className={`text-2xl font-bold ${
                            pontosPositivos
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {pontosPositivos
                            ? "+"
                            : ""}
                          {movimentacao.pontos}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          pontos
                        </p>

                      </div>

                    </div>

                    <div className="border-t border-zinc-800 mt-5 pt-5">

                      <p className="font-bold">
                        {movimentacao.descricao}
                      </p>

                      {movimentacao.quantidade && (
                        <p className="text-zinc-400 mt-2">
                          Quantidade:{" "}
                          {movimentacao.quantidade}
                        </p>
                      )}

                      <p className="text-zinc-400 mt-2">
                        Saldo:{" "}
                        {movimentacao.saldo_anterior}
                        {" → "}
                        {movimentacao.saldo_novo}
                      </p>

                      <p className="text-zinc-500 text-sm mt-3">
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

                    <Link
                      href={`/admin/cliente/${movimentacao.cliente_codigo}`}
                      className="block mt-5 bg-zinc-800 hover:bg-zinc-700 rounded-xl py-3 text-center transition"
                    >
                      Abrir cliente
                    </Link>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

    </main>
  );
}