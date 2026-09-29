// Fluxo e regressão essencial com SQL local e serviços externos simulados.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {loadTs,criarBaseline}=require('./test-financeiro.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
async function main(){
  const db=new PGlite();let admin=true;let cookie;
  try{
    await criarBaseline(db);await db.exec(readFileSync('database/proposals/0001_financeiro.sql','utf8'));
    const sql=async(strings,...values)=>(await db.query(strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values)).rows;
    const mocks={
      '@/lib/db':{sql},
      'next/headers':{cookies:async()=>({get:()=>({value:'fixture'}),set:v=>{cookie=v;}})},
      '@/lib/auth':{COOKIE_ADMIN:'fixture',sessaoAdminValida:()=>admin,credenciaisAdminValidas:()=>admin,criarSessaoAdmin:()=> 'fixture',DURACAO_SESSAO_SEGUNDOS:60},
      'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
      'next/navigation':{notFound(){throw new Error('not-found');},redirect(url){throw new Error(url);}},
      '@/lib/financeiro/disponibilidade':{financeiroDisponivel:async()=>true},
      '@/lib/financeiro/pedido':loadTs('lib/financeiro/pedido.ts'),
    };
    const request=body=>new Request('http://fixture.local',{method:'POST',body:JSON.stringify(body)});
    const clients=loadTs('app/api/clientes-v2/route.ts',mocks);
    const fixture={codigo:'AH000001',nome:'Fixture de regressão',whatsapp:'fixture'};
    assert.equal((await clients.POST(request(fixture))).status,201);
    assert.equal((await clients.POST(request(fixture))).status,409);
    const search=loadTs('app/api/clientes-v2/buscar/route.ts',mocks);
    assert.equal((await (await search.GET(new Request('http://fixture.local?q=AH000001'))).json()).clientes.length,1);
    await db.exec("INSERT INTO produtos_v2(id,nome,descricao,pontos,preco_centavos) VALUES('p','Fixture','',3,1050); INSERT INTO recompensas_v2(id,nome,descricao,pontos) VALUES('r','Fixture','',2)");
    const sales=loadTs('app/api/vendas-v2/route.ts',mocks);
    const order={codigo:fixture.codigo,itens:[{produtoId:'p',quantidade:2}],descontoCentavos:'100',chave:'fixture-fluxo-completo'};
    const response=await sales.POST(request(order));assert.equal(response.status,201);
    const body=await response.json();assert.equal(body.venda.total_centavos,'2000');assert.equal(body.venda.saldoNovo,6);
    for(const file of ['app/cliente/[codigo]/page.tsx','app/cliente/[codigo]/historico/page.tsx']){
      const Page=loadTs(file,mocks).default;
      assert.ok(renderToStaticMarkup(await Page({params:Promise.resolve({codigo:fixture.codigo})})).includes(fixture.nome));
    }
    const ranking=[...readFileSync('app/admin/ranking/page.tsx','utf8').matchAll(/await sql`([\s\S]*?)`/g)];
    for(const match of ranking)assert.equal(Number((await db.query(match[1])).rows[0].conquistados),6);
    const rewards=loadTs('app/api/recompensas-v2/route.ts',mocks);assert.equal((await rewards.GET()).status,200);
    const redeem=loadTs('app/api/resgates-v2/route.ts',mocks);
    assert.equal((await redeem.POST(request({codigo:fixture.codigo,recompensaId:'r'}))).status,201);
    assert.equal((await db.query('SELECT pontos FROM clientes_v2')).rows[0].pontos,4);
    assert.deepEqual(await (await sales.POST(request(order))).json(),body);
    const login=loadTs('app/api/auth/login/route.ts',mocks);
    assert.equal((await login.POST(request({}))).status,200);assert.equal(cookie.httpOnly,true);
    admin=false;assert.equal((await login.POST(request({}))).status,401);
    assert.equal((await search.GET(new Request('http://fixture.local?q=AH000001'))).status,401);
    const NFC=loadTs('app/c/[codigo]/page.tsx',mocks).default;
    await assert.rejects(()=>NFC({params:Promise.resolve({codigo:fixture.codigo})}),e=>e.message==='/cliente/AH000001');
    admin=true;
    await assert.rejects(()=>NFC({params:Promise.resolve({codigo:fixture.codigo})}),e=>e.message==='/admin/cliente/AH000001');
    await assert.rejects(()=>NFC({params:Promise.resolve({codigo:'AH000002'})}),e=>e.message==='/cadastro?codigo=AH000002');
    const photos=loadTs('app/api/foto-cliente/route.ts',{...mocks,'@vercel/blob':{
      put:async()=>({url:'https://fixture.invalid/photo.png'}),del:async()=>{throw new Error('Nenhuma foto anterior deve ser removida');},
    }});
    const form=new FormData();form.set('codigo',fixture.codigo);form.set('foto',new File(['fixture'],'fixture.png',{type:'image/png'}));
    const photo=await photos.POST(new Request('http://fixture.local',{method:'POST',body:form}));
    assert.equal(photo.status,200);
    assert.equal((await db.query('SELECT foto_url FROM clientes_v2')).rows[0].foto_url,'https://fixture.invalid/photo.png');
    for(const [file,method] of [
      ['compras','POST'],['clientes','GET'],['clientes/cliente/[codigo]','GET'],['historico','GET'],['historico/[codigo]','GET'],['ranking','GET'],['recompensas','GET'],['resgatar','POST'],['estatisticas','GET'],
    ])assert.equal((await loadTs(`app/api/${file}/route.ts`)[method](request({}))).status,410);
    console.log('OK: cadastro/busca; venda->itens/pontos->perfil/histórico/ranking->resgate/replay; login/cookie e NFC (sessão simulada); fotos (Blob simulado); recompensas; V1 410.');
  }finally{await db.close();}
}
main().catch(e=>{console.error('Falha de regressão:',e.code||e.name,e.message);process.exitCode=1;});
