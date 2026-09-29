const { loadEnvConfig } = require('@next/env');
const { neon } = require('@neondatabase/serverless');
const fs = require('node:fs');
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  const sql = neon(process.env.DATABASE_URL);
  for (const page of ['pontos', 'ranking', 'estatisticas']) {
    const source = fs.readFileSync(`app/admin/${page}/page.tsx`, 'utf8');
    const queries = [...source.matchAll(/await sql`([\s\S]*?)`/g)];
    for (const [index, match] of queries.entries()) {
      if (match[1].includes('${')) throw new Error('Consulta interpolada não suportada');
      const [rows] = await sql.transaction([sql.query(match[1])], { readOnly: true });
      console.log(`${page} consulta ${index + 1}: OK (${rows.length} linhas; conteúdo omitido)`);
    }
  }
}
main().catch(() => { console.error('Validação falhou; detalhes omitidos para proteger dados.'); process.exitCode = 1; });
