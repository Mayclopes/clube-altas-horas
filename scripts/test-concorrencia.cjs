// PostgreSQL nativo descartável, só 127.0.0.1, sem .env/Neon/credenciais reais.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto');
const {Client}=require('pg');
const {criarBaseline,loadTs}=require('./test-financeiro.cjs');
const pedido=loadTs('lib/financeiro/pedido.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const platform={win32:'windows',linux:'linux',darwin:'darwin'}[process.platform];
  if(!platform)throw new Error('Plataforma sem binários isolados');
  const binaries=await import(`@embedded-postgres/${platform}-${process.arch}`);
  fs.mkdirSync('node_modules/.cache/financeiro',{recursive:true});
  const dataDir=fs.mkdtempSync(path.join('node_modules/.cache/financeiro','pg-'));
  const absolute=path.resolve(dataDir);
  assert.ok(absolute.startsWith(path.resolve('node_modules/.cache/financeiro')+path.sep));
  const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));
  const port=listener.address().port;await new Promise(r=>listener.close(r));
  const env={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP,LC_ALL:'C'};
  const run=(bin,args)=>new Promise((resolve,reject)=>{
    const child=spawn(bin,args,{windowsHide:true,env,stdio:'ignore'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`PostgreSQL local: saída ${code}`)));
  });
  const connections=[];let server;let started=false;
  const connect=async()=>{
    const c=new Client({host:'127.0.0.1',port,user:'fixture',database:'postgres',password:'',ssl:false,connectionTimeoutMillis:1000});
    await c.connect();connections.push(c);return c;
  };
  try{
    await run(binaries.initdb,['-D',absolute,'--username=fixture','--auth=trust','--locale=C','--encoding=UTF8']);
    server=spawn(binaries.postgres,['-D',absolute,'-h','127.0.0.1','-p',String(port),'-c','fsync=off'],{windowsHide:true,env,stdio:'ignore'});
    let spawnError;server.on('error',e=>{spawnError=e;});
    let db;
    for(let i=0;i<100;i++){if(spawnError)throw spawnError;try{db=await connect();break;}catch{await delay(100);}}
    if(!db)throw new Error('PostgreSQL local não iniciou');started=true;
    db.exec=q=>db.query(q);
    await criarBaseline(db);await db.exec(fs.readFileSync('database/proposals/0001_financeiro.sql','utf8'));
    await db.exec(`INSERT INTO produtos_v2(id,nome,descricao,pontos,preco_centavos) VALUES
      ('p','Fixture','',2,1050),('fail','Falha','',99,100);
      INSERT INTO recompensas_v2(id,nome,descricao,pontos) VALUES ('r','Fixture','',1);
      CREATE FUNCTION falha_concorrente() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.pontos=99 THEN RAISE EXCEPTION 'Falha sintética'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER falha_fixture BEFORE INSERT ON movimentacoes_v2 FOR EACH ROW EXECUTE FUNCTION falha_concorrente();`);
    const c1=await connect(),c2=await connect(),gate=await connect();
    const make=codigo=>({codigo,itens:[{produtoId:'p',quantidade:1}],descontoCentavos:'0',chave:randomUUID()});
    const sale=(c,raw)=>{
      const p=pedido.normalizarPedido(raw),hash=createHash('sha256').update(pedido.payloadCanonico(p)).digest('hex');
      return c.query('SELECT registrar_venda_v2($1,$2::jsonb,$3::bigint,$4,$5) AS resposta',[p.codigo,JSON.stringify(p.itens),p.descontoCentavos,p.chave,hash]);
    };
    const tag=c=>async(strings,...values)=>(await c.query(strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values)).rows;
    const old=loadTs('app/api/compras-v2/route.ts',{'@/lib/db':{sql:tag(c2)}});
    const redeem=loadTs('app/api/resgates-v2/route.ts',{
      '@/lib/db':{sql:tag(c2)},'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},
      '@/lib/auth':{COOKIE_ADMIN:'fixture',sessaoAdminValida:()=>true},
    });
    const request=body=>new Request('http://fixture.local',{method:'POST',body:JSON.stringify(body)});
    async function client(code){await db.query("INSERT INTO clientes_v2(id,codigo,nome,whatsapp,pontos) VALUES($1,$1,'Sintético','fixture',100)",[code]);}
    async function state(code){return (await db.query(`SELECT pontos,compras,
      (SELECT count(*)::int FROM vendas_v2 WHERE cliente_codigo=$1) AS vendas,
      (SELECT count(*)::int FROM itens_venda_v2 i JOIN vendas_v2 v ON v.id=i.venda_id WHERE v.cliente_codigo=$1) AS itens,
      (SELECT count(*)::int FROM movimentacoes_v2 WHERE cliente_codigo=$1) AS movimentos,
      (SELECT count(*)::int FROM operacoes_v2 o JOIN vendas_v2 v ON v.operacao_id=o.id WHERE v.cliente_codigo=$1) AS operacoes
      FROM clientes_v2 WHERE codigo=$1`,[code])).rows[0];}
    async function parallel(code,first,second){
      await gate.query('BEGIN');await gate.query('SELECT codigo FROM clientes_v2 WHERE codigo=$1 FOR UPDATE',[code]);
      const results=Promise.allSettled([first(),second()]);let blocked=false;
      try{
        for(let i=0;i<100;i++){
          const r=await db.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid IN ($1,$2) AND wait_event_type='Lock'",[c1.processID,c2.processID]);
          if(r.rows[0].n===2){blocked=true;break;}await delay(20);
        }
      }finally{await gate.query('ROLLBACK');}
      const settled=await results;assert.ok(blocked,'Duas conexões devem disputar locks antes da liberação');return settled;
    }
    const expected=(pontos,compras,vendas,movimentos=vendas)=>({pontos,compras,vendas,itens:vendas,movimentos,operacoes:vendas});
    let code='AH000001';await client(code);
    assert.ok((await parallel(code,()=>sale(c1,make(code)),()=>sale(c2,make(code)))).every(r=>r.status==='fulfilled'));
    assert.deepEqual(await state(code),expected(104,2,2));
    code='AH000002';await client(code);let p=make(code);
    const same=await parallel(code,()=>sale(c1,p),()=>sale(c2,p));
    assert.deepEqual(same[0].value.rows,same[1].value.rows);assert.deepEqual(await state(code),expected(102,1,1));
    code='AH000003';await client(code);p=make(code);
    const conflict=await parallel(code,()=>sale(c1,p),()=>sale(c2,{...p,descontoCentavos:'1'}));
    assert.equal(conflict.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(conflict.find(r=>r.status==='rejected').reason.code,'P2007');assert.deepEqual(await state(code),expected(102,1,1));
    code='AH000004';await client(code);
    const compatible=await parallel(code,()=>sale(c1,make(code)),()=>old.POST(request({codigo:code,produtoId:'p',quantidade:1})));
    assert.equal(compatible[1].value.status,201);assert.deepEqual(await state(code),expected(104,2,1,2));
    code='AH000005';await client(code);
    const redeemed=await parallel(code,()=>sale(c1,make(code)),()=>redeem.POST(request({codigo:code,recompensaId:'r'})));
    assert.equal(redeemed[1].value.status,201);assert.deepEqual(await state(code),expected(101,1,1,2));
    await client('AH000006');await client('AH000007');
    await Promise.all([sale(c1,make('AH000006')),sale(c2,make('AH000007'))]);
    assert.deepEqual(await state('AH000006'),expected(102,1,1));assert.deepEqual(await state('AH000007'),expected(102,1,1));
    code='AH000008';await client(code);
    const failure=await parallel(code,()=>sale(c1,make(code)),()=>sale(c2,{...make(code),itens:[{produtoId:'fail',quantidade:1}]}));
    assert.equal(failure.filter(r=>r.status==='rejected').length,1);assert.deepEqual(await state(code),expected(102,1,1));
    code='AH000009';await client(code);
    await parallel(code,()=>sale(c1,make(code)),()=>c2.query('UPDATE clientes_v2 SET pontos=pontos+10 WHERE codigo=$1',[code]));
    assert.deepEqual(await state(code),expected(112,1,1));
    assert.equal((await db.query("SELECT count(*)::int AS n FROM operacoes_v2 WHERE estado<>'CONCLUIDA'")).rows[0].n,0);
    console.log('OK: PostgreSQL nativo, múltiplas conexões e bloqueio observado: 2 vendas; mesma chave; conflito; compra-v2; resgate; clientes distintos; falha concorrente; alteração de saldo. Contagens/saldo/rollback conferidos.');
  }finally{
    await Promise.allSettled(connections.map(c=>c.end()));
    if(started) {
      try {await run(binaries.pg_ctl,['-D',absolute,'-m','fast','-w','-t','10','stop']);}
      catch (erro) {
        // Apenas o filho criado aqui; nunca localizar/matar um PostgreSQL externo.
        const pid=Number(fs.readFileSync(path.join(absolute,'postmaster.pid'),'utf8').split(/\r?\n/)[0]);
        if(process.platform!=='win32'||pid!==server.pid)throw erro;
        await run('taskkill',['/PID',String(server.pid),'/T','/F']);
        console.log('Limpeza: PostgreSQL sintético encerrado por PID próprio após parada normal indisponível.');
      }
    }
    else if(server)server.kill();
    // Dados sintéticos ficam apenas em node_modules/.cache (ignorado), sem remoção recursiva.
  }
}
main().catch(e=>{console.error('Falha na concorrência isolada:',e.code||e.name,e.message);process.exitCode=1;});
