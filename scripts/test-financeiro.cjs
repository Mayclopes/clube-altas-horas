// PostgreSQL WASM em memória. Não carrega .env, não possui cliente Neon, não usa rede.
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const ts = require('typescript');
function loadTs(path, mocks = {}) {
  const js = ts.transpileModule(readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}}; new Function('module','exports','require',js)(mod,mod.exports,id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)); return mod.exports;
}
const money=loadTs('lib/financeiro/dinheiro.ts');
const pedido=loadTs('lib/financeiro/pedido.ts');
async function criarBaseline(db) {
    const baseline=JSON.parse(readFileSync('database/baseline-schema.json','utf8'));
    for(const table of ['clientes_v2','produtos_v2','recompensas_v2','movimentacoes_v2']) {
      const cols=baseline.columns.filter(c=>c.table_name===table).map(c=>
        `"${c.column_name}" ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}${c.is_nullable==='NO'?' NOT NULL':''}${c.column_default!==null?` DEFAULT ${c.column_default}`:''}`);
      await db.exec(`CREATE TABLE public.${table} (${cols.join(',')})`);
    }
    for(const type of ['p','u','c','f']) for(const c of baseline.constraints.filter(c=>c.tipo===type))
      await db.exec(`ALTER TABLE public.${c.tabela} ADD CONSTRAINT "${c.nome}" ${c.definicao}`);
    for (const index of baseline.indexes) {
      const exists = await db.query('SELECT to_regclass($1) AS name',[index.indexname]);
      if (!exists.rows[0].name) await db.exec(index.indexdef);
    }
}
async function main() {
  const db = new PGlite();
  try {
    await criarBaseline(db);
    await db.exec(`INSERT INTO clientes_v2(id,codigo,nome,whatsapp,pontos,compras) VALUES
      ('legacy','AH000099','Sintético legado','fixture',5,1);
      INSERT INTO produtos_v2(id,nome,descricao,pontos) VALUES ('legacy','Produto legado','',5);
      INSERT INTO recompensas_v2(id,nome,descricao,pontos) VALUES ('r1','Recompensa fictícia','',1);
      INSERT INTO movimentacoes_v2(id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo)
        VALUES ('premigration','AH000099','COMPRA','Fixture legada',5,0,5);`);
    const legacyBefore=(await db.query("SELECT to_jsonb(c) AS cliente FROM clientes_v2 c WHERE id='legacy'")).rows;
    const available=()=>db.query("SELECT to_regprocedure('public.registrar_venda_v2(text,jsonb,bigint,text,text)') IS NOT NULL AS ok");
    assert.equal((await available()).rows[0].ok,false);
    await db.query("SELECT to_jsonb(p)->>'preco_centavos' AS preco_centavos FROM produtos_v2 p");
    await db.exec(readFileSync('database/proposals/0001_financeiro.sql','utf8'));
    assert.equal((await available()).rows[0].ok,true);
    assert.deepEqual((await db.query("SELECT to_jsonb(c) AS cliente FROM clientes_v2 c WHERE id='legacy'")).rows,legacyBefore);
    assert.equal((await db.query("SELECT venda_id FROM movimentacoes_v2 WHERE id='premigration'")).rows[0].venda_id,null);
    assert.equal((await db.query("SELECT preco_centavos FROM produtos_v2 WHERE id='legacy'")).rows[0].preco_centavos,null);
    await assert.rejects(()=>db.exec(readFileSync('database/proposals/0001_financeiro.sql','utf8')),e=>e.code==='42701');
    await db.exec('ROLLBACK');
    assert.equal((await available()).rows[0].ok,true);
    const reports=loadTs('lib/financeiro/relatorios.ts');
    const empty=(await db.query(reports.RESUMO_FINANCEIRO)).rows[0];
    assert.equal(empty.faturamento,'0');assert.equal(empty.vendas,'0');assert.equal(empty.intervalo_segundos,null);
    await db.exec(`INSERT INTO clientes_v2(id,codigo,nome,whatsapp,ativo) VALUES
      ('c1','AH000001','Fixture A','fixture',true),('c2','AH000002','Fixture B','fixture',false),
      ('c3','AH000003','Fixture C','fixture',true);
      INSERT INTO produtos_v2(id,nome,descricao,pontos,ativo,preco_centavos) VALUES
      ('p1','Fixture 1','',2,true,1050),('p2','Fixture 2','',3,true,2000),
      ('p3','Sem preco','',1,true,NULL),('p4','Inativo','',1,false,100);`);
    let seq=0;
    const make=(overrides={})=>({codigo:'AH000001',itens:[{produtoId:'p1',quantidade:1}],descontoCentavos:'0',chave:`fixture-chave-${String(++seq).padStart(10,'0')}`,...overrides});
    async function sell(raw) {
      const p=pedido.normalizarPedido(raw);
      const hash=createHash('sha256').update(pedido.payloadCanonico(p)).digest('hex');
      const r=await db.query('SELECT public.registrar_venda_v2($1,$2::jsonb,$3::bigint,$4,$5) AS resposta',[p.codigo,JSON.stringify(p.itens),p.descontoCentavos,p.chave,hash]);
      return r.rows[0].resposta;
    }
    const counts=async()=> (await db.query(`SELECT (SELECT count(*)::int FROM vendas_v2) AS vendas,
      (SELECT count(*)::int FROM itens_venda_v2) AS itens,(SELECT count(*)::int FROM movimentacoes_v2) AS movimentos,
      (SELECT count(*)::int FROM operacoes_v2) AS operacoes,(SELECT sum(pontos)::int FROM clientes_v2) AS saldo,
      (SELECT sum(compras)::int FROM clientes_v2) AS compras`)).rows[0];
    const first=make(); const a=await sell(first);
    assert.equal(a.venda.total_centavos,'1050');assert.equal(a.venda.pontos,2);
    assert.deepEqual(await sell(first),a);
    const beforeConflict=await counts();
    await assert.rejects(()=>sell({...first,descontoCentavos:'1'}), e=>e.code==='P2007');
    assert.deepEqual(await counts(),beforeConflict);
    const multi=await sell(make({itens:[{produtoId:'p2',quantidade:1},{produtoId:'p1',quantidade:2}],descontoCentavos:'100'}));
    assert.equal(multi.venda.subtotal_centavos,'4100');assert.equal(multi.venda.total_centavos,'4000');assert.equal(multi.venda.pontos,7);
    assert.equal(multi.venda.compras,2);
    const dup=make(); const [d1,d2]=await Promise.all([sell(dup),sell(dup)]);assert.deepEqual(d1,d2);
    for(const [raw,code] of [
      [make({descontoCentavos:'1051'}),'P2005'],
      [make({itens:[{produtoId:'p3',quantidade:1}]}),'P2004'],
      [make({itens:[{produtoId:'p4',quantidade:1}]}),'P2003'],
      [make({itens:[{produtoId:'ausente',quantidade:1}]}),'P2003'],
      [make({codigo:'AH999999'}),'P2001'],[make({codigo:'AH000002'}),'P2002']
    ]) {const before=await counts();await assert.rejects(()=>sell(raw),e=>e.code===code);assert.deepEqual(await counts(),before);}
    assert.throws(()=>pedido.normalizarPedido(make({itens:[{produtoId:'p1',quantidade:101}]})));
    assert.throws(()=>pedido.normalizarPedido(make({itens:[{produtoId:'p1',quantidade:1.5}]})));
    assert.throws(()=>pedido.normalizarPedido(make({itens:[{produtoId:'p1',quantidade:1},{produtoId:'p1',quantidade:1}]})));
    const tampered=await sell(make({itens:[{produtoId:'p1',quantidade:1,preco:1,pontos:999999}]}));
    assert.equal(tampered.venda.total_centavos,'1050');assert.equal(tampered.venda.pontos,2);
    await db.exec("UPDATE produtos_v2 SET preco_centavos=1200,pontos=4,nome='Novo nome' WHERE id='p1'");
    assert.deepEqual(await sell(first),a); // replay congela resposta mesmo após catálogo mudar
    const historical=(await db.query('SELECT preco_unitario_centavos::text AS preco, produto_nome FROM itens_venda_v2 WHERE venda_id=$1',[a.venda.id])).rows[0];
    assert.equal(historical.preco,'1050');assert.equal(historical.produto_nome,'Fixture 1');
    await db.exec(`CREATE FUNCTION teste_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.cliente_codigo='AH000003' THEN RAISE EXCEPTION 'falha ficticia'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER falha_ficticia BEFORE INSERT ON movimentacoes_v2 FOR EACH ROW EXECUTE FUNCTION teste_falha();`);
    const beforeFailure=await counts();await assert.rejects(()=>sell(make({codigo:'AH000003'})));assert.deepEqual(await counts(),beforeFailure);
    await assert.rejects(()=>db.exec("UPDATE produtos_v2 SET preco_centavos=-1 WHERE id='p1'"),e=>e.code==='23514');
    await assert.rejects(()=>db.exec("UPDATE vendas_v2 SET cliente_codigo='AH999999'"),e=>e.code==='23514');
    await assert.rejects(()=>db.exec("UPDATE vendas_v2 SET subtotal_centavos=subtotal_centavos+1"),e=>e.code==='23514');
    await assert.rejects(()=>db.exec("UPDATE itens_venda_v2 SET quantidade=quantidade+1"),e=>e.code==='23514');
    for (const statement of [
      'UPDATE vendas_v2 SET pontos_gerados=pontos_gerados+1',
      'UPDATE movimentacoes_v2 SET pontos=pontos+1 WHERE venda_id IS NOT NULL',
      "UPDATE movimentacoes_v2 SET cliente_codigo='AH000002' WHERE venda_id IS NOT NULL",
      "UPDATE movimentacoes_v2 SET venda_id=NULL,operacao_id=NULL WHERE venda_id IS NOT NULL",
      "UPDATE operacoes_v2 SET resposta=jsonb_set(resposta,'{venda,total_centavos}','\"999\"'::jsonb)",
      "UPDATE operacoes_v2 SET requisicao_hash=repeat('a',64)",
      "UPDATE itens_venda_v2 SET produto_nome='Adulterado'",
    ]) {
      const before=await counts();
      await assert.rejects(()=>db.exec(statement),e=>e.code==='23514');
      assert.deepEqual(await counts(),before);
    }
    // Corrupções em novas linhas também precisam falhar, não só alterações de snapshots.
    async function corrupt(label, mutate, code='23514') {
      const before=await counts();
      await db.exec('BEGIN');
      try {
        await db.exec(`INSERT INTO operacoes_v2(id,tipo,chave,requisicao_hash,estado)
          VALUES('bad-op','COMPRA','fixture-bad-operation',repeat('a',64),'PROCESSANDO');
          INSERT INTO vendas_v2(id,cliente_codigo,operacao_id,subtotal_centavos,pontos_gerados,compras_apos)
          VALUES('bad-sale','AH000001','bad-op',1050,2,1);
          INSERT INTO itens_venda_v2(id,venda_id,produto_id,produto_nome,quantidade,preco_unitario_centavos,pontos_unitarios)
          VALUES('bad-item','bad-sale','p1','Fixture 1',1,1050,2);`);
        await assert.rejects(async()=>{await mutate();await db.exec('SET CONSTRAINTS ALL IMMEDIATE');},e=>e.code===code,label);
      } finally {await db.exec('ROLLBACK');}
      assert.deepEqual(await counts(),before);
    }
    await corrupt('venda sem movimento',async()=>{});
    await corrupt('segunda linha do mesmo produto',()=>db.exec(`INSERT INTO itens_venda_v2
      (id,venda_id,produto_id,produto_nome,quantidade,preco_unitario_centavos,pontos_unitarios)
      VALUES('duplicate','bad-sale','p1','Duplicado',1,1050,2)`),'23505');
    await assert.rejects(()=>db.query(`INSERT INTO movimentacoes_v2
      (id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo,venda_id,operacao_id)
      SELECT 'duplicate-credit',cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo,venda_id,operacao_id
      FROM movimentacoes_v2 WHERE venda_id=$1`,[tampered.venda.id]),e=>e.code==='23505');
    await db.exec(`CREATE FUNCTION fixture_corromper() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE modo text := current_setting('fixture.corruption',true);
      BEGIN
        IF TG_TABLE_NAME='vendas_v2' THEN
          IF modo='venda-pontos' THEN NEW.pontos_gerados:=NEW.pontos_gerados+1; END IF;
        ELSIF TG_TABLE_NAME='itens_venda_v2' THEN
          IF modo='item-total' THEN NEW.preco_unitario_centavos:=NEW.preco_unitario_centavos+1; END IF;
        ELSIF TG_TABLE_NAME='movimentacoes_v2' THEN
          IF modo='movimento-pontos' THEN NEW.pontos:=NEW.pontos+1; END IF;
          IF modo='movimento-cliente' THEN NEW.cliente_codigo:='AH000002'; END IF;
          IF modo='movimento-ausente' THEN RETURN NULL; END IF;
        ELSIF TG_TABLE_NAME='operacoes_v2' THEN
          IF modo='resposta' THEN NEW.resposta:=jsonb_set(NEW.resposta,'{venda,total_centavos}','"999"'::jsonb); END IF;
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER aa_fixture BEFORE INSERT ON vendas_v2 FOR EACH ROW EXECUTE FUNCTION fixture_corromper();
      CREATE TRIGGER aa_fixture BEFORE INSERT ON itens_venda_v2 FOR EACH ROW EXECUTE FUNCTION fixture_corromper();
      CREATE TRIGGER aa_fixture BEFORE INSERT ON movimentacoes_v2 FOR EACH ROW EXECUTE FUNCTION fixture_corromper();
      CREATE TRIGGER aa_fixture BEFORE UPDATE ON operacoes_v2 FOR EACH ROW EXECUTE FUNCTION fixture_corromper();`);
    for (const modo of ['venda-pontos','item-total','movimento-pontos','movimento-cliente','movimento-ausente','resposta']) {
      const before=await counts();await db.exec('BEGIN');
      try {
        await db.query("SELECT set_config('fixture.corruption',$1,true)",[modo]);
        await assert.rejects(async()=>{await sell(make());await db.exec('SET CONSTRAINTS ALL IMMEDIATE');},e=>e.code==='23514',modo);
      } finally {await db.exec('ROLLBACK');}
      assert.deepEqual(await counts(),before);
    }
    assert.equal(money.reaisParaCentavos('10,50'),'1050');assert.equal(money.reaisParaCentavos('0.01'),'1');
    assert.throws(()=>money.reaisParaCentavos('1,001'));assert.throws(()=>money.reaisParaCentavos('-1'));
    assert.equal(money.mediaCentavos('101',2),'51');assert.equal(money.mediaCentavos('0',0),null);
    assert.equal(money.formatarDinheiro('9007199254740993'),'R$ 90.071.992.547.409,93');
    for (const [input,expected] of [['0,01','1'],['1,00','100'],['10.50','1050'],['100,00','10000'],['999,99','99999'],['0','0']])
      assert.equal(money.reaisParaCentavos(input),expected);
    for (const input of ['', '-0,01', 'abc', '1,234', '1.000,00', '.', ',']) assert.throws(()=>money.reaisParaCentavos(input));
    const totals=(await db.query(reports.RESUMO_FINANCEIRO)).rows[0];
    assert.equal(totals.faturamento,'7150');assert.equal(totals.vendas,'4');assert.equal(totals.unidades,'6');
    assert.equal(totals.faturamento_mes,'7150');assert.equal(totals.vendas_mes,'4');assert.equal(totals.intervalos,'3');
    assert.equal(totals.pontos,'13');assert.equal(totals.clientes,'1');
    assert.equal(money.mediaCentavos(totals.faturamento,totals.vendas),'1788');
    assert.equal(money.mediaCentavos(totals.faturamento_mes,totals.vendas_mes),'1788');
    assert.equal(money.mediaCentavos(totals.faturamento,totals.clientes),'7150');
    assert.equal((await db.query(reports.TOP_QUANTIDADE)).rows[0].unidades,'5');
    assert.equal((await db.query(reports.TOP_FATURAMENTO)).rows[0].bruto,'5250');
    await db.exec("INSERT INTO movimentacoes_v2(id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo) VALUES('legado','AH000001','COMPRA','Legado ficticio',1,0,1)");
    assert.equal((await db.query(reports.RESUMO_FINANCEIRO)).rows[0].faturamento,'7150');
    // Handler real com cookies simulados e transporte SQL para o banco em memória.
    let autorizado=false, ativo=true;
    const tag=async(strings,...values)=> (await db.query(strings.reduce((s,part,i)=>s+(i?`$${i}`:'')+part,''),values)).rows;
    const route=loadTs('app/api/vendas-v2/route.ts',{
      'next/headers':{cookies:async()=>({get:()=>({value:'sessao-ficticia'})})},
      '@/lib/auth':{COOKIE_ADMIN:'fixture',sessaoAdminValida:()=>autorizado},
      '@/lib/db':{sql:tag}, '@/lib/financeiro/disponibilidade':{financeiroDisponivel:async()=>ativo},
      '@/lib/financeiro/pedido':pedido,
    });
    const request=body=>new Request('http://fixture.local/api/vendas-v2',{method:'POST',body:JSON.stringify(body)});
    const apiPedido=make();
    assert.equal((await route.POST(request(apiPedido))).status,401);
    autorizado=true;ativo=false;assert.equal((await route.POST(request(apiPedido))).status,503);
    ativo=true;assert.equal((await route.POST(request({}))).status,400);
    assert.equal((await route.POST(request({extra:'x'.repeat(32769)}))).status,413);
    for (const raw of [null,[],{...apiPedido,chave:'x'},{...apiPedido,descontoCentavos:-1},
      {...apiPedido,itens:Array.from({length:31},(_,i)=>({produtoId:String(i),quantidade:1}))},
      {...apiPedido,itens:[{produtoId:'',quantidade:1}]}, {...apiPedido,itens:[{produtoId:'p1',quantidade:'1'}]}])
      assert.equal((await route.POST(request(raw))).status,400);
    const apiResponse=await route.POST(request(apiPedido));assert.equal(apiResponse.status,201);
    const apiBody=await apiResponse.json();
    assert.deepEqual(await (await route.POST(request(apiPedido))).json(),apiBody);
    const conflict=await route.POST(request({...apiPedido,descontoCentavos:'1'}));assert.equal(conflict.status,409);
    assert.equal((await conflict.json()).podeEditar,false);
    const invalid=await route.POST(request(make({descontoCentavos:'99999'})));assert.equal(invalid.status,400);
    assert.equal((await invalid.json()).podeEditar,true);
    const products=loadTs('app/api/produtos-v2/route.ts',{
      '@/lib/db':{sql:tag},'@/lib/financeiro/disponibilidade':{financeiroDisponivel:async()=>ativo},
      '@/lib/financeiro/dinheiro':money,
    });
    assert.equal((await products.GET()).headers.get('X-Financeiro-Disponivel'),'true');
    const productUpdate={id:'p1',nome:'Fixture preço',pontos:4,ativo:true,preco_centavos:'1250'};
    const updated=await products.PUT(request(productUpdate));assert.equal(updated.status,200);
    assert.equal((await updated.json()).produto.preco_centavos,'1250');
    assert.equal((await products.PUT(request({...productUpdate,preco_centavos:12.50}))).status,400);
    ativo=false;assert.equal((await products.PUT(request(productUpdate))).status,409);
    // Transação externa revertida, desconto integral e preço zero continuam exatos.
    const beforeRollback=await counts();
    await db.exec('BEGIN');
    const free=await sell(make({descontoCentavos:'1250'}));assert.equal(free.venda.total_centavos,'0');
    await db.exec('ROLLBACK');assert.deepEqual(await counts(),beforeRollback);
    await db.exec("UPDATE produtos_v2 SET preco_centavos=0 WHERE id='p1'");
    const zero=await sell(make());assert.equal(zero.venda.total_centavos,'0');assert.equal(zero.venda.pontos,4);
    // Limite de mês: compra no primeiro instante do mês seguinte não entra no mês corrente.
    const shiftedSql=reports.RESUMO_FINANCEIRO.replace('v.criado_em',"(CASE WHEN v.id=$1 THEN ((date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 month') AT TIME ZONE 'America/Sao_Paulo') ELSE v.criado_em END)")
      .replace('AND v.criado_em',"AND (CASE WHEN v.id=$1 THEN ((date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 month') AT TIME ZONE 'America/Sao_Paulo') ELSE v.criado_em END)");
    const shifted=(await db.query(shiftedSql,[multi.venda.id])).rows[0];
    assert.equal(BigInt(shifted.faturamento)-BigInt(shifted.faturamento_mes),BigInt(4000));
    const cancelled=(await db.query(reports.RESUMO_FINANCEIRO.replace("v.status = 'CONFIRMADA'","v.status = 'CONFIRMADA' AND v.id<>$1"),[multi.venda.id])).rows[0];
    assert.equal(BigInt(shifted.faturamento)-BigInt(cancelled.faturamento),BigInt(4000));
    const resgates=loadTs('app/api/resgates-v2/route.ts',{
      '@/lib/db':{sql:tag},'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},
      '@/lib/auth':{COOKIE_ADMIN:'fixture',sessaoAdminValida:()=>true},
    });
    const beforeResgate=(await db.query("SELECT pontos FROM clientes_v2 WHERE codigo='AH000001'")).rows[0].pontos;
    assert.equal((await resgates.POST(request({codigo:'AH000001',recompensaId:'r1'}))).status,201);
    assert.equal((await db.query("SELECT pontos FROM clientes_v2 WHERE codigo='AH000001'")).rows[0].pontos,beforeResgate-1);
    const compras=loadTs('app/api/compras-v2/route.ts',{'@/lib/db':{sql:tag}});
    assert.equal((await compras.POST(request({codigo:'AH000001',produtoId:'p1',quantidade:1}))).status,201);
    assert.equal((await db.query("SELECT pontos FROM clientes_v2 WHERE codigo='AH000001'")).rows[0].pontos,beforeResgate+3);
    assert.deepEqual(await sell(first),a); // resgate/compra futura não alteram a resposta histórica
    const {renderToStaticMarkup}=require('react-dom/server');
    const React=require('react');
    const Cart=loadTs('app/admin/cliente/[codigo]/CarrinhoVenda.tsx',{
      'next/navigation':{useRouter:()=>({refresh(){}})},
      '@/lib/financeiro/dinheiro':money,'@/lib/financeiro/pedido':pedido,
    }).default;
    const cartHtml=renderToStaticMarkup(React.createElement(Cart,{codigo:'AH000001',produtos:[
      {id:'p1',nome:'Fixture',descricao:'',ativo:true,pontos:2,preco_centavos:'1050'},
      {id:'p3',nome:'Sem preço',descricao:'',ativo:true,pontos:1,preco_centavos:null},
    ]}));
    assert.ok(cartHtml.includes('CONFIRMAR VENDA'));assert.ok(cartHtml.includes('Sem preço'));
    const Financial=loadTs('app/admin/estatisticas/EstatisticasFinanceiras.tsx',{
      '@/lib/db':{sql:{query:q=>q,transaction:async qs=>Promise.all(qs.map(async q=>(await db.query(q)).rows))}},
      '@/lib/financeiro/disponibilidade':{financeiroDisponivel:async()=>ativo},
      '@/lib/financeiro/dinheiro':money,'@/lib/financeiro/relatorios':reports,
    }).default;
    ativo=false;assert.ok(renderToStaticMarkup(await Financial()).includes('ainda não ativado'));
    ativo=true;assert.ok(renderToStaticMarkup(await Financial()).includes('Faturamento total'));
    console.log('OK: migration isolada; constraints/FKs/totais; vendas simples/multiplas; desconto e validacoes; idempotencia/reenvio; snapshots; rollback; dinheiro; relatorios; API 401/400/409/503/201; preços.');
  } finally {await db.close();}
}
module.exports={loadTs,criarBaseline};
if (require.main === module) main().catch(e=>{console.error('Falha nos testes isolados:',e.code ?? e.name,e.message);process.exitCode=1;});
