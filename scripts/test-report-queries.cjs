// Testa SQL real com fixtures efêmeras em CTEs e READ ONLY. Nenhuma tabela é criada.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadEnvConfig } = require('@next/env');
const { neon } = require('@neondatabase/serverless');
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const fixtures = `
  limites AS (SELECT date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' AS inicio),
  clientes_fixture(codigo,nome,pontos,compras,ativo,criado_em) AS (
    VALUES ('A','Teste A',5,2,true,'2020-01-01'::timestamptz),
           ('B','Teste B',30,2,true,'2020-01-02'::timestamptz),
           ('C','Teste C',100,1,false,'2020-01-03'::timestamptz)),
  recompensas_fixture(id,pontos,ativo) AS (VALUES ('r1',5,true),('r2',0,true),('r3',1,false)),
  movimentos_fixture(id,cliente_codigo,tipo,pontos,criado_em) AS (
    SELECT '1','A','COMPRA',10,inicio FROM limites UNION ALL
    SELECT '2','A','COMPRA',20,inicio + interval '2 days' FROM limites UNION ALL
    SELECT '3','A','RESGATE',-25,inicio + interval '3 days' FROM limites UNION ALL
    SELECT '4','A','BONUS',999,inicio FROM limites UNION ALL
    SELECT '5','A','AJUSTE',999,inicio FROM limites UNION ALL
    SELECT '6','B','COMPRA',30,inicio - interval '1 day' FROM limites UNION ALL
    SELECT '7','B','COMPRA',0,inicio + interval '1 day' FROM limites UNION ALL
    SELECT '8','C','COMPRA',100,inicio FROM limites)
`;
function withFixtures(query) {
  const replaced = query.replaceAll('clientes_v2','clientes_fixture')
    .replaceAll('recompensas_v2','recompensas_fixture').replaceAll('movimentacoes_v2','movimentos_fixture');
  return /^\s*WITH\b/i.test(replaced)
    ? `WITH ${fixtures}, ${replaced.replace(/^\s*WITH\s*/i,'')}`
    : `WITH ${fixtures} ${replaced}`;
}
async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const results = {};
  for (const page of ['pontos','ranking','estatisticas']) {
    const source = fs.readFileSync(`app/admin/${page}/page.tsx`,'utf8');
    results[page] = [];
    for (const match of source.matchAll(/await sql`([\s\S]*?)`/g)) {
      const [rows] = await sql.transaction([sql.query(withFixtures(match[1]))], { readOnly: true });
      results[page].push(rows);
    }
  }
  assert.equal(results.pontos[0].length,2);
  assert.equal(Number(results.pontos[0][0].recompensas_disponiveis),1);
  assert.deepEqual(results.ranking[0].map(r=>r.codigo),['A','B']);
  assert.equal(Number(results.ranking[0][0].conquistados),30);
  assert.deepEqual(results.ranking[1].map(r=>r.codigo),['A']);
  const stats = results.estatisticas[0][0];
  assert.equal(Number(stats.compras),5);
  assert.equal(Number(stats.conquistados),160);
  assert.equal(Number(stats.utilizados),25);
  assert.equal(Number(stats.primeira_compra),3);
  assert.equal(Number(stats.segunda_compra),2);
  assert.equal(Number(stats.intervalo_segundos),172800);
  assert.equal(Number(stats.total_intervalos),2);
  const rankingSource = fs.readFileSync('app/admin/ranking/page.tsx','utf8');
  const monthlyQuery = [...rankingSource.matchAll(/await sql`([\s\S]*?)`/g)][1][1];
  const atUpperBound = withFixtures(monthlyQuery).replace(
    "inicio - interval '1 day'",
    "((date_trunc('month', inicio AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo')"
  );
  const [upperRows] = await sql.transaction([sql.query(atUpperBound)], {readOnly:true});
  assert.deepEqual(upperRows.map(r=>r.codigo),['A']);
  const statsQuery = [...fs.readFileSync('app/admin/estatisticas/page.tsx','utf8').matchAll(/await sql`([\s\S]*?)`/g)][0][1];
  const emptyQuery = `WITH ${fixtures},
    clientes_empty AS (SELECT * FROM clientes_fixture WHERE false),
    movimentos_empty AS (SELECT * FROM movimentos_fixture WHERE false),
    ${statsQuery.replace(/^\s*WITH\s*/i,'').replaceAll('clientes_v2','clientes_empty').replaceAll('movimentacoes_v2','movimentos_empty')}`;
  const [emptyStats] = await sql.transaction([sql.query(emptyQuery)], {readOnly:true});
  assert.equal(Number(emptyStats[0].primeira_compra),0);
  assert.equal(Number(emptyStats[0].compras),0);
  assert.equal(emptyStats[0].intervalo_segundos,null);
  const [boundary] = await sql.transaction([sql.query(`WITH p AS (
    SELECT date_trunc('month', TIMESTAMPTZ '2026-10-01 02:59:59+00' AT TIME ZONE 'America/Sao_Paulo') AS inicio
  ) SELECT (inicio AT TIME ZONE 'America/Sao_Paulo') = TIMESTAMPTZ '2026-09-01 03:00:00+00' AS inicio_ok,
    ((inicio + interval '1 month') AT TIME ZONE 'America/Sao_Paulo') = TIMESTAMPTZ '2026-10-01 03:00:00+00' AS fim_ok FROM p`)], {readOnly:true});
  assert.equal(boundary[0].inicio_ok,true); assert.equal(boundary[0].fim_ok,true);
  // EXPLAIN sem ANALYZE apenas planeja a instrução de escrita: não a executa.
  const purchase = fs.readFileSync('app/api/compras-v2/route.ts','utf8');
  const query = [...purchase.matchAll(/await sql`([\s\S]*?)`/g)].at(-1)[1];
  const values=[];
  const params={produtoId:'__teste_inexistente__',codigo:'__teste_inexistente__',quantidade:1,movimentacaoId:'__teste_inexistente__'};
  const parameterized=query.replace(/\$\{(\w+)\}/g,(_,key)=>{assert.ok(Object.hasOwn(params,key));values.push(params[key]);return `$${values.length}`;});
  await sql.transaction([sql.query(`EXPLAIN ${parameterized}`,values)],{readOnly:true});
  console.log('OK: fixtures de saldo/conquista, filtros, desempate, resgates, retenção, intervalos e fuso; EXPLAIN da compra atômica sem execução.');
}
main().catch(e=>{console.error(`Falha de validação (${e.code ?? e.name}); detalhes omitidos.`);process.exitCode=1;});
