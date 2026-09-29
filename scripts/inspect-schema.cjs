// Catálogos e agregados somente leitura. Nunca imprime a conexão ou erros brutos.
const { loadEnvConfig } = require('@next/env');
const { neon } = require('@neondatabase/serverless');
const fs = require('node:fs');
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const tables = ['clientes_v2', 'produtos_v2', 'recompensas_v2', 'movimentacoes_v2'];
  const result = await sql.transaction([
    sql`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
      character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = ANY(${tables}) ORDER BY table_name, ordinal_position`,
    sql`SELECT c.relname AS tabela, con.conname AS nome, con.contype AS tipo,
      pg_get_constraintdef(con.oid) AS definicao
      FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY(${tables}) ORDER BY 1,2`,
    sql`SELECT tablename, indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = ANY(${tables}) ORDER BY 1,2`,
    sql`SELECT current_setting('TimeZone') AS timezone,
      current_setting('transaction_read_only') AS read_only,
      MIN(criado_em) AS primeira_movimentacao, MAX(criado_em) AS ultima_movimentacao,
      COUNT(*) AS movimentacoes, COUNT(*) FILTER (WHERE criado_em IS NULL) AS sem_data
      FROM movimentacoes_v2`,
    sql`SELECT c.relname AS tabela, pg_get_triggerdef(t.oid) AS definicao
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname = ANY(${tables})`
  ], { readOnly: true });
  const schema = { columns: result[0], constraints: result[1], indexes: result[2], triggers: result[4] };
  fs.writeFileSync('database/baseline-schema.json', JSON.stringify(schema, null, 2) + '\n');
  console.log(JSON.stringify({ schema, temporal: result[3] }, null, 2));
}
main().catch(() => { console.error('Falha na inspeção somente leitura; detalhes omitidos para proteger credenciais.'); process.exitCode = 1; });
