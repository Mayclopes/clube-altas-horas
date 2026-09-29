import { sql } from "@/lib/db";
import { financeiroDisponivel } from "@/lib/financeiro/disponibilidade";
import { formatarDinheiro, mediaCentavos } from "@/lib/financeiro/dinheiro";
import { RESUMO_FINANCEIRO, TOP_QUANTIDADE, TOP_FATURAMENTO } from "@/lib/financeiro/relatorios";

export default async function EstatisticasFinanceiras() {
  if (!(await financeiroDisponivel())) return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-2xl font-bold text-red-500">Financeiro</h2>
      <p className="mt-3 text-zinc-300">Registro de vendas ainda não ativado. Não há dados financeiros disponíveis.</p>
      <p className="mt-3 text-sm text-zinc-400">Dados financeiros contabilizados a partir da ativação do registro de vendas.</p>
    </section>
  );
  const [resumos, porQuantidade, porFaturamento] = await sql.transaction([
    sql.query(RESUMO_FINANCEIRO), sql.query(TOP_QUANTIDADE), sql.query(TOP_FATURAMENTO),
  ], { readOnly: true, isolationLevel: "RepeatableRead" });
  const r = resumos[0];
  const ticket = mediaCentavos(String(r.faturamento), String(r.vendas));
  const ticketMes = mediaCentavos(String(r.faturamento_mes), String(r.vendas_mes));
  const gasto = mediaCentavos(String(r.faturamento), String(r.clientes));
  const count = (v: unknown) => BigInt(String(v)).toLocaleString("pt-BR");
  const cards = [
    ["Faturamento total", formatarDinheiro(String(r.faturamento))],
    ["Faturamento do mês", formatarDinheiro(String(r.faturamento_mes))],
    ["Vendas confirmadas", count(r.vendas)], ["Vendas no mês", count(r.vendas_mes)],
    ["Ticket médio", ticket === null ? "Sem vendas" : formatarDinheiro(ticket)],
    ["Ticket médio do mês", ticketMes === null ? "Sem vendas" : formatarDinheiro(ticketMes)],
    ["Clientes compradores", count(r.clientes)],
    ["Gasto médio por cliente", gasto === null ? "Sem compradores" : formatarDinheiro(gasto)],
    ["Unidades vendidas", count(r.unidades)], ["Pontos gerados nas vendas", count(r.pontos)],
  ];
  const segundos = r.intervalo_segundos === null ? null : Number(r.intervalo_segundos);
  const intervalo = segundos === null ? "Sem intervalos suficientes" : segundos === 0 ? "0 horas" : segundos < 36 ? "Menos de 0,01 hora" :
    `${(segundos / (segundos < 86400 ? 3600 : 86400)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${segundos < 86400 ? "horas" : "dias"}`;
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-red-500">Financeiro · vendas confirmadas</h2>
      <p className="mt-3 text-zinc-400">Dados financeiros contabilizados a partir da ativação do registro de vendas.</p>
      <p className="mt-2 text-sm text-zinc-500">Valores líquidos do desconto da venda. Mês em America/Sao_Paulo. Compras antigas sem preço não entram nestes totais.</p>
      {r.primeira_venda && <p className="mt-2 text-sm text-zinc-500">Primeira venda confirmada: {new Date(r.primeira_venda).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
      {String(r.vendas) === "0" && <p className="mt-5 rounded-xl bg-zinc-900 p-5">Nenhuma venda financeira confirmada. Os valores serão preenchidos após o primeiro registro.</p>}
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><dt className="text-zinc-400">{label}</dt><dd className="mt-3 break-words text-2xl font-bold">{value}</dd></div>)}
      </dl>
      <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-bold">Intervalo médio entre vendas</h3><p className="mt-2 text-2xl text-red-400">{intervalo}</p>
        <p className="mt-3 text-sm text-zinc-400">Média de {count(r.intervalos)} intervalos consecutivos por cliente. Uma venda é um evento, independentemente dos itens. Não inclui operações antigas sem venda.</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {[{ title: "Top produtos por quantidade", rows: porQuantidade }, { title: "Top produtos por faturamento bruto", rows: porFaturamento }].map(({title, rows}) => (
          <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-lg font-bold">{title}</h3>
            {!rows.length ? <p className="mt-4 text-zinc-400">Nenhum item vendido.</p> : <ol className="mt-4 space-y-4">{rows.map((p, i) => <li key={String(p.id)}><p className="break-words">{i + 1}º · {String(p.nome)}</p><p className="text-sm text-zinc-400">{count(p.unidades)} unidades · {formatarDinheiro(String(p.bruto))} antes do desconto</p></li>)}</ol>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-500">O desconto é global e não foi rateado entre produtos. O ranking de produtos usa subtotais históricos brutos e nomes atuais do catálogo.</p>
    </section>
  );
}
