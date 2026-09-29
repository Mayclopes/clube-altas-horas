import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Ranking() {
  const ranking = await sql`
    WITH compras AS (
      SELECT cliente_codigo,
        COALESCE(SUM(pontos) FILTER (WHERE pontos > 0), 0) AS conquistados,
        COUNT(*) AS total_compras
      FROM movimentacoes_v2
      WHERE tipo = 'COMPRA'
      GROUP BY cliente_codigo
    )
    SELECT c.codigo, c.nome, c.pontos AS saldo,
      COALESCE(m.conquistados, 0) AS conquistados,
      COALESCE(m.total_compras, 0) AS total_compras
    FROM clientes_v2 c
    LEFT JOIN compras m ON m.cliente_codigo = c.codigo
    WHERE c.ativo = TRUE
    ORDER BY conquistados DESC, total_compras DESC,
      c.criado_em ASC NULLS LAST, c.codigo ASC
  `;
  // Limites locais convertidos para instantes timestamptz; intervalo [início, fim).
  const mensal = await sql`
    WITH periodo AS (
      SELECT date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') AS inicio
    ), compras AS (
      SELECT m.cliente_codigo, SUM(m.pontos) AS conquistados, COUNT(*) AS total_compras
      FROM movimentacoes_v2 m CROSS JOIN periodo p
      WHERE m.tipo = 'COMPRA' AND m.pontos > 0
        AND m.criado_em >= (p.inicio AT TIME ZONE 'America/Sao_Paulo')
        AND m.criado_em < ((p.inicio + INTERVAL '1 month') AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY m.cliente_codigo
    )
    SELECT c.codigo, c.nome, m.conquistados, m.total_compras
    FROM clientes_v2 c JOIN compras m ON m.cliente_codigo = c.codigo
    WHERE c.ativo = TRUE
    ORDER BY m.conquistados DESC, m.total_compras DESC, c.criado_em ASC, c.codigo ASC
    LIMIT 10
  `;
  const destaques = [
    "border-yellow-600 bg-yellow-950/30",
    "border-zinc-400 bg-zinc-800",
    "border-orange-700 bg-orange-950/30",
  ];

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-zinc-400 hover:text-white">← Voltar ao painel</Link>
        <h1 className="mt-6 text-4xl font-bold text-red-500">Ranking geral</h1>
        <p className="mt-3 text-zinc-400">Clientes ativos. Pontos conquistados são a soma dos pontos positivos de COMPRA em todo o histórico V2. Resgates não reduzem essa pontuação; bônus e ajustes não entram.</p>
        <p className="mt-3 text-sm text-zinc-500">Desempate: mais registros de COMPRA, cadastro mais antigo e código. Clientes sem compras aparecem com zero pontos conquistados.</p>
        {ranking.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">Nenhum cliente ativo para exibir no ranking.</p>
        ) : (
          <ol className="mt-8 space-y-4">
            {ranking.map((c, i) => (
              <li key={String(c.codigo)} className={`rounded-2xl border p-5 ${destaques[i] ?? "border-zinc-800 bg-zinc-900"}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold">{i + 1}º</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/cliente/${encodeURIComponent(String(c.codigo))}`} className="break-words text-xl font-bold hover:underline">{String(c.nome)}</Link>
                    <p className="mt-1 text-sm text-zinc-400">{String(c.codigo)}</p>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div><dt className="text-sm text-zinc-400">Pontos conquistados</dt><dd className="text-2xl font-bold text-red-400">{Number(c.conquistados).toLocaleString("pt-BR")}</dd></div>
                      <div><dt className="text-sm text-zinc-400">Registros de compra</dt><dd className="text-xl">{Number(c.total_compras).toLocaleString("pt-BR")}</dd></div>
                      <div><dt className="text-sm text-zinc-400">Saldo disponível</dt><dd className="text-xl">{Number(c.saldo).toLocaleString("pt-BR")}</dd></div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-red-500">Ranking do mês atual · Top 10</h2>
          <p className="mt-3 text-zinc-400">Mês corrente em America/Sao_Paulo. Somente compras com pontos positivos; os desempates seguem o ranking geral.</p>
          {mensal.length === 0 ? (
            <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-5">Nenhuma compra com pontos positivos de clientes ativos neste mês.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {mensal.map((c, i) => (
                <li key={String(c.codigo)} className={`rounded-2xl border p-5 ${destaques[i] ?? "border-zinc-800 bg-zinc-900"}`}>
                  <p className="break-words text-xl font-bold">{i + 1}º · {String(c.nome)}</p>
                  <p className="mt-3 text-2xl font-bold text-red-400">{Number(c.conquistados).toLocaleString("pt-BR")} pontos no mês</p>
                  <p className="mt-2 text-zinc-300">{Number(c.total_compras).toLocaleString("pt-BR")} compras com pontos positivos no mês</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
