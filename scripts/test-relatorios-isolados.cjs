// Reutiliza a suíte de relatórios sem ambiente, conexão Neon ou rede.
const {PGlite}=require('@electric-sql/pglite');
const {readFileSync}=require('node:fs');
const {criarBaseline}=require('./test-financeiro.cjs');
async function main(){
  const db=new PGlite();
  try {
    await criarBaseline(db);
    const sql={query:(text,values)=>({text,values}),transaction:async queries=>{
      const rows=[];for(const q of queries) rows.push((await db.query(q.text,q.values)).rows);return rows;
    }};
    const source=readFileSync('scripts/test-report-queries.cjs','utf8');
    await new Function('require','process',source.replace('main().catch','return main().catch'))(id=>{
      if(id==='@next/env') return {loadEnvConfig(){}};
      if(id==='@neondatabase/serverless') return {neon:()=>sql};
      return require(id);
    },{env:{},cwd:()=>process.cwd(),set exitCode(value){if(value)throw new Error('Suíte de relatórios falhou');}});
  } finally {await db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
