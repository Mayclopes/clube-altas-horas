// Limpeza destrutiva somente em PGlite com fixtures sintéticas; não carrega .env.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { criarBaseline, loadTs } = require('./test-financeiro.cjs');
const pedido = loadTs('lib/financeiro/pedido.ts');

async function main() {
  const db = new PGlite();
  try {
    await criarBaseline(db);
    await db.exec(readFileSync('database/proposals/0001_financeiro.sql', 'utf8'));
    await db.exec(readFileSync('database/proposals/0002_limpeza_cliente.sql', 'utf8'));
    await db.exec(`INSERT INTO clientes_v2(id,codigo,nome,whatsapp,nascimento,pontos,compras,ativo,foto_url) VALUES
      ('a','AH000101','Cliente A','fixture','2000-01-01',0,0,true,'https://fixture.invalid/a.png'),
      ('b','AH000102','Cliente B','fixture','2001-01-01',0,0,false,'https://fixture.invalid/b.png'),
      ('c','AH000103','Cliente C','fixture',NULL,0,0,true,NULL),
      ('d','AH000104','Cliente D','fixture',NULL,0,0,true,NULL);
      INSERT INTO produtos_v2(id,nome,descricao,pontos,preco_centavos) VALUES ('p','Produto','',3,1000);
      INSERT INTO recompensas_v2(id,nome,descricao,pontos) VALUES ('r','Recompensa','',2);`);
    let n = 0;
    async function venda(codigo) {
      const bruto = { codigo, itens: [{ produtoId: 'p', quantidade: 1 }], descontoCentavos: '0', chave: `limpeza-fixture-${String(++n).padStart(12,'0')}` };
      const p = pedido.normalizarPedido(bruto);
      const hash = createHash('sha256').update(pedido.payloadCanonico(p)).digest('hex');
      return (await db.query('SELECT registrar_venda_v2($1,$2::jsonb,$3::bigint,$4,$5) AS resposta',[p.codigo,JSON.stringify(p.itens),p.descontoCentavos,p.chave,hash])).rows[0].resposta;
    }
    await venda('AH000101'); await venda('AH000103');
    await db.exec(`UPDATE clientes_v2 SET pontos=5 WHERE codigo='AH000101';
      INSERT INTO movimentacoes_v2(id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo)
      VALUES ('resgate-a','AH000101','RESGATE','Fixture',-2,5,3),('legado-a','AH000101','BONUS','Fixture',2,3,5),
             ('origem-d','AH000104','BONUS','Fixture',1,0,1);
      INSERT INTO movimentacoes_v2(id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo,movimentacao_origem_id)
      VALUES ('referencia-b','AH000102','BONUS','Fixture',1,3,4,'origem-d');`);
    const antesA = (await db.query("SELECT id,codigo,nome,whatsapp,nascimento,ativo,foto_url,criado_em FROM clientes_v2 WHERE codigo='AH000101'")).rows[0];
    const antesB = (await db.query("SELECT to_jsonb(c) AS c FROM clientes_v2 c WHERE codigo='AH000102'")).rows[0].c;
    const contagem = async codigo => (await db.query(`SELECT c.pontos,c.compras,
      (SELECT count(*)::int FROM movimentacoes_v2 WHERE cliente_codigo=c.codigo) movimentos,
      (SELECT count(*)::int FROM vendas_v2 WHERE cliente_codigo=c.codigo) vendas,
      (SELECT count(*)::int FROM itens_venda_v2 i JOIN vendas_v2 v ON v.id=i.venda_id WHERE v.cliente_codigo=c.codigo) itens,
      (SELECT count(*)::int FROM operacoes_v2 o JOIN vendas_v2 v ON v.operacao_id=o.id WHERE v.cliente_codigo=c.codigo) operacoes
      FROM clientes_v2 c WHERE c.codigo=$1`, [codigo])).rows[0];
    await assert.rejects(() => db.query("SELECT limpar_dados_cliente_v2('invalido')"), e => e.code === 'P2010');
    await assert.rejects(() => db.query("SELECT limpar_dados_cliente_v2('AH999999')"), e => e.code === 'P2001');
    await assert.rejects(() => db.query("SELECT limpar_dados_cliente_v2('AH000104')"), e => e.code === 'P2011');
    assert.equal((await contagem('AH000104')).movimentos, 1);
    const resultado = (await db.query("SELECT limpar_dados_cliente_v2('AH000101') AS resultado")).rows[0].resultado;
    assert.deepEqual(resultado, { sucesso: true, movimentacoes: 3, itens: 1, vendas: 1, operacoes: 1 });
    const depoisA = (await db.query("SELECT id,codigo,nome,whatsapp,nascimento,ativo,foto_url,criado_em,pontos,compras FROM clientes_v2 WHERE codigo='AH000101'")).rows[0];
    assert.deepEqual(Object.fromEntries(Object.keys(antesA).map(k => [k,depoisA[k]])), antesA);
    assert.deepEqual(await contagem('AH000101'), { pontos: 0, compras: 0, movimentos: 0, vendas: 0, itens: 0, operacoes: 0 });
    assert.deepEqual((await db.query("SELECT to_jsonb(c) AS c FROM clientes_v2 c WHERE codigo='AH000102'")).rows[0].c, antesB);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM vendas_v2 WHERE cliente_codigo='AH000101'")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM movimentacoes_v2 WHERE cliente_codigo='AH000101'")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM operacoes_v2")).rows[0].n, 1);
    // Falha no meio da limpeza deve desfazer inclusive as movimentações já removidas.
    await db.exec(`CREATE FUNCTION falhar_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF OLD.cliente_codigo='AH000103' THEN RAISE EXCEPTION 'falha sintética'; END IF; RETURN OLD; END $$;
      CREATE TRIGGER falhar_reset_fixture BEFORE DELETE ON vendas_v2 FOR EACH ROW EXECUTE FUNCTION falhar_reset();`);
    const antesFalha = await contagem('AH000103');
    await assert.rejects(() => db.query("SELECT limpar_dados_cliente_v2('AH000103')"));
    assert.deepEqual(await contagem('AH000103'), antesFalha);
    // Endpoint: sessão, senha, código e confirmação são checados antes da função.
    let autorizado = false;
    const tag = async (strings,...values) => (await db.query(strings.reduce((sql,parte,i)=>sql+(i?`$${i}`:'')+parte,''),values)).rows;
    const route = loadTs('app/api/clientes-v2/[codigo]/zerar-dados/route.ts', {
      'next/headers': { cookies: async () => ({ get: () => ({ value: 'sessao-ficticia' }) }) },
      '@/lib/auth': { COOKIE_ADMIN: 'fixture', sessaoAdminValida: () => autorizado, senhaAdminValida: senha => senha === 'senha-ficticia' },
      '@/lib/db': { sql: tag },
    });
    const request = body => new Request('http://fixture.local', { method:'POST', body: JSON.stringify(body) });
    const ctx = codigo => ({ params: Promise.resolve({ codigo }) });
    assert.equal((await route.POST(request({senha:'senha-ficticia',confirmacao:'ZERAR AH000102'}),ctx('AH000102'))).status,401);
    autorizado = true;
    assert.equal((await route.POST(request({senha:'x',confirmacao:'ZERAR AH000102'}),ctx('AH000102'))).status,401);
    assert.equal((await route.POST(request({senha:'senha-ficticia'}),ctx('AH000102'))).status,400);
    assert.equal((await route.POST(request({senha:'senha-ficticia',confirmacao:'ZERAR AH000102'}),ctx('invalido'))).status,400);
    assert.equal((await route.POST(request({senha:'senha-ficticia',confirmacao:'ZERAR AH999999'}),ctx('AH999999'))).status,404);
    assert.equal((await route.POST(request({senha:'senha-ficticia',confirmacao:'ZERAR AH000102'}),ctx('AH000102'))).status,200);
    assert.deepEqual(await contagem('AH000102'), { pontos: 0, compras: 0, movimentos: 0, vendas: 0, itens: 0, operacoes: 0 });
    console.log('OK: limpeza atômica isolada; cadastro/foto/código preservados; pontos, compras, movimentos, resgates, vendas, itens e operações removidos; senha/sessão/confirmação; referência externa e rollback; outro cliente intacto.');
  } finally { await db.close(); }
}
main().catch(e => { console.error('Falha na limpeza isolada:', e.code ?? e.name, e.message); process.exitCode = 1; });
