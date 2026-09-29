import Link from "next/link";
import { sql } from "@/lib/db";
import EstatisticasFinanceiras from "./EstatisticasFinanceiras";

export const dynamic = "force-dynamic";

export default async function Estatisticas() {
  const [dados] = await sql`
    WITH clientes AS (
      SELECT COUNT(*) AS total_clientes,
        COUNT(*) FILTER (WHERE ativo = TRUE) AS ativos,
        COUNT(*) FILTER (WHERE ativo = FALSE) AS inativos,
        COALESCE(SUM(pontos), 0) AS saldo
      FROM clientes_v2
    ), movimentos AS (
      SELECT COUNT(*) FILTER (WHERE tipo = 'COMPRA') AS compras,
        COUNT(*) FILTER (WHERE tipo = 'RESGATE') AS resgates,
        COUNT(DISTINCT cliente_codigo) FILTER (WHERE tipo = 'RESGATE') AS clientes_resgate,
        COALESCE(SUM(pontos) FILTER (WHERE tipo = 'COMPRA' AND pontos > 0), 0) AS conquistados,
        COALESCE(SUM(-pontos) FILTER (WHERE tipo = 'RESGATE' AND pontos < 0), 0) AS utilizados
      FROM movimentacoes_v2
    ), compras_por_cliente AS (
      SELECT cliente_codigo, COUNT(*) AS quantidade
      FROM movimentacoes_v2
      WHERE tipo = 'COMPRA' AND cliente_codigo IS NOT NULL
      GROUP BY cliente_codigo
    ), retencao AS (
      SELECT COUNT(*) AS primeira_compra,
        COUNT(*) FILTER (WHERE quantidade >= 2) AS segunda_compra
      FROM compras_por_cliente
    ), sequencia AS (
      SELECT criado_em,
        LAG(criado_em) OVER (PARTITION BY cliente_codigo ORDER BY criado_em, id) AS anterior
      FROM movimentacoes_v2
      WHERE tipo = 'COMPRA'
    ), frequencia AS (
      SELECT AVG(EXTRACT(EPOCH FROM (criado_em - anterior))) AS intervalo_segundos,
        COUNT(*) AS total_intervalos
      FROM sequencia WHERE anterior IS NOT NULL
    )
    SELECT * FROM clientes CROSS JOIN movimentos CROSS JOIN retencao CROSS JOIN frequencia
  `;
  // Média ponderada pelos intervalos observados, não média das médias por cliente.
  // COMPRA é operação registrada: não existe venda_id para deduplicar visitas.
  const segundos = dados.intervalo_segundos === null ? null : Number(dados.intervalo_segundos);
  const intervalo = segundos === null ? "Sem intervalos suficientes" :
    segundos === 0 ? "0 horas" : segundos < 36 ? "Menos de 0,01 hora" :
    `${(segundos / (segundos < 86400 ? 3600 : 86400)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${segundos < 86400 ? "horas" : "dias"}`;
  const primeira = Number(dados.primeira_compra);
  const segunda = Number(dados.segunda_compra);
  const taxa = primeira > 0 ? (segunda / primeira) * 100 : null;
  const indicadores = [
    ["Total de clientes", dados.total_clientes],
    ["Clientes ativos", dados.ativos],
    ["Clientes inativos", dados.inativos],
    ["Registros de compra", dados.compras],
    ["Total de resgates", dados.resgates],
    ["Pontos atualmente disponíveis", dados.saldo],
    ["Pontos conquistados em COMPRA", dados.conquistados],
    ["Pontos utilizados em RESGATE", dados.utilizados],
    ["Clientes com pelo menos um resgate", dados.clientes_resgate],
  ];

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-zinc-400 hover:text-white">← Voltar ao painel</Link>
        <h1 className="mt-6 text-4xl font-bold text-red-500">Estatísticas V2</h1>
        <p className="mt-3 text-zinc-400">Todo o histórico registrado na V2, incluindo clientes ativos e inativos. Cada movimentação COMPRA conta como um registro, independentemente da quantidade de produtos.</p>
        <EstatisticasFinanceiras />
        <h2 className="mt-8 text-2xl font-bold">Fidelidade · visão geral</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {indicadores.map(([titulo, valor]) => (
            <div key={String(titulo)} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <dt className="text-zinc-400">{String(titulo)}</dt>
              <dd className="mt-3 text-3xl font-bold text-red-400">{Number(valor).toLocaleString("pt-BR")}</dd>
            </div>
          ))}
        </dl>
        {Number(dados.compras) === 0 && Number(dados.resgates) === 0 && (
          <p className="mt-5 rounded-xl border border-zinc-800 p-5 text-zinc-300">Ainda não há registros de compra ou resgate na V2.</p>
        )}
        <p className="mt-4 text-sm text-zinc-500">Conquista: pontos positivos de COMPRA. Utilização: magnitude dos pontos negativos de RESGATE. O saldo vem dos cadastros; pode incluir outros tipos de crédito ou débitos.</p>
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Segunda compra</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-zinc-400">Clientes com pelo menos 1 compra</dt><dd className="mt-2 text-2xl font-bold">{primeira.toLocaleString("pt-BR")}</dd></div>
            <div><dt className="text-zinc-400">Clientes com pelo menos 2 compras</dt><dd className="mt-2 text-2xl font-bold">{segunda.toLocaleString("pt-BR")}</dd></div>
          </dl>
          <p className="mt-6 text-3xl font-bold text-red-400">{taxa === null ? "Sem base para calcular" : `${taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</p>
          <p className="mt-3 text-zinc-300">{segunda.toLocaleString("pt-BR")} de {primeira.toLocaleString("pt-BR")} clientes que compraram possuem pelo menos dois registros de COMPRA.</p>
          <p className="mt-3 text-sm text-zinc-400">Taxa = clientes com 2 ou mais compras ÷ clientes com pelo menos 1 compra × 100. Dois registros podem ocorrer no mesmo atendimento; esta métrica não comprova uma nova visita.</p>
        </section>
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Intervalo médio entre compras</h2>
          <p className="mt-4 text-3xl font-bold text-red-400">{intervalo}</p>
          <p className="mt-3 text-zinc-400">Média de {Number(dados.total_intervalos).toLocaleString("pt-BR")} intervalos entre registros consecutivos de COMPRA do mesmo cliente, incluindo ativos e inativos.</p>
          <p className="mt-3 text-sm text-zinc-400">Cada registro é uma operação, não necessariamente uma visita física. Sem identificação de venda, produtos registrados separadamente não podem ser agrupados com segurança. Intervalos de zero também entram na média.</p>
          <p className="mt-3 text-zinc-400">Retorno após resgate será calculado quando a janela temporal e a regra de retorno forem definidas.</p>
        </section>
      </div>
    </main>
  );
}
