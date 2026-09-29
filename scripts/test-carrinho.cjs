// DOM isolado: não inicia Next, não carrega .env e não faz chamadas de rede.
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { loadTs } = require('./test-financeiro.cjs');
const React = require('react');
const { act } = React;
const money = loadTs('lib/financeiro/dinheiro.ts');
const pedido = loadTs('lib/financeiro/pedido.ts');
async function main() {
  const dom = new JSDOM('<main id="root"></main>', {url:'http://fixture.local'});
  global.window=dom.window;global.document=dom.window.document;
  global.sessionStorage=dom.window.sessionStorage;global.IS_REACT_ACT_ENVIRONMENT=true;
  const { createRoot } = require('react-dom/client');
  let refreshes=0;
  const Cart=loadTs('app/admin/cliente/[codigo]/CarrinhoVenda.tsx',{
    'next/navigation':{useRouter:()=>({refresh(){refreshes++;}})},
    '@/lib/financeiro/dinheiro':money,'@/lib/financeiro/pedido':pedido,
  }).default;
  const produtos=[
    {id:'p1',nome:'Produto',descricao:'',ativo:true,pontos:2,preco_centavos:'1050'},
    {id:'p2',nome:'Gratuito',descricao:'',ativo:true,pontos:1,preco_centavos:'0'},
    {id:'p3',nome:'Não configurado',descricao:'',ativo:true,pontos:1,preco_centavos:null},
  ];
  const host=document.getElementById('root');let root;
  const mount=async()=>{root=createRoot(host);await act(async()=>root.render(React.createElement(Cart,{codigo:'AH000001',produtos})));};
  const buttons=()=>[...host.querySelectorAll('button')];
  const confirm=()=>buttons().find(b=>/CONFIRMAR VENDA|REPETIR CONFIRMAÇÃO|Confirmando/.test(b.textContent));
  const click=async b=>act(async()=>b.click());
  const success=()=>Response.json({sucesso:true,venda:{id:'fixture',total_centavos:'1050',pontos:2,saldoNovo:2}});
  try {
    await mount();assert.equal(confirm().disabled,true);
    assert.ok(host.textContent.includes('Sem preço configurado'));assert.ok(host.textContent.includes('R$ 0,00'));
    assert.equal(buttons().filter(b=>b.textContent==='Adicionar')[2].disabled,true);
    await click(buttons().find(b=>b.textContent==='Adicionar'));
    let calls=[];let resolve;
    global.fetch=async(_,options)=>{calls.push(JSON.parse(options.body));return new Promise(r=>{resolve=r;});};
    await act(async()=>{confirm().click();confirm().click();});
    assert.equal(calls.length,1);assert.equal(confirm().disabled,true);
    assert.equal(JSON.parse(sessionStorage.getItem('clube-venda-pendente-AH000001')).chave,calls[0].chave);
    await act(async()=>resolve(new Response('indisponível',{status:502})));
    assert.ok(host.querySelector('[role=alert]'));assert.equal(confirm().disabled,false);
    await act(async()=>root.unmount());await mount();
    assert.ok(confirm().textContent.includes('REPETIR'));
    global.fetch=async(_,options)=>{calls.push(JSON.parse(options.body));return success();};
    await click(confirm());assert.deepEqual(calls[1],calls[0]);
    assert.equal(sessionStorage.length,0);assert.equal(refreshes,1);
    assert.ok(host.querySelector('[role=status]').textContent.includes('registrada'));
    // Timeout conserva intenção/chave, sem permitir editar e gerar crédito duplicado.
    await click(buttons().find(b=>b.textContent==='Adicionar'));
    const originalTimer=global.setTimeout;
    global.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===20000?1:ms,...args);
    global.fetch=async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError'))));
    try {await act(async()=>{confirm().click();await new Promise(r=>originalTimer(r,20));});}
    finally {global.setTimeout=originalTimer;}
    assert.ok(host.textContent.includes('Sem confirmação do servidor'));
    const pending=JSON.parse(sessionStorage.getItem('clube-venda-pendente-AH000001'));
    assert.ok(pending.chave);assert.ok(confirm().textContent.includes('REPETIR'));
    global.fetch=async()=>Response.json({erro:'Produto sem preço.',podeEditar:true},{status:409});
    await click(confirm());assert.equal(sessionStorage.length,0);
    assert.ok(host.textContent.includes('Produto sem preço.'));
    // Limite de quantidade e desconto inválido permanecem bloqueados no DOM.
    for(let i=1;i<100;i++) await click(buttons().find(b=>b.getAttribute('aria-label')==='Aumentar Produto'));
    assert.equal(buttons().find(b=>b.getAttribute('aria-label')==='Aumentar Produto').disabled,true);
    const input=host.querySelector('input');
    await act(async()=>{
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'-1');
      input.dispatchEvent(new window.Event('input',{bubbles:true}));
    });
    assert.equal(confirm().disabled,true);
    await act(async()=>root.unmount());
    sessionStorage.setItem('clube-venda-pendente-AH000001',JSON.stringify({...pending,codigo:'AH000002'}));
    await mount();assert.equal(confirm().disabled,true);assert.ok(host.textContent.includes('Não foi possível recuperar'));
    console.log('OK: carrinho DOM; vazio/null/zero; duplo clique; rede lenta/502; refresh/retry mesma chave; timeout; erro editável; 100 unidades; desconto; recuperação divergente.');
  } finally {if(root) await act(async()=>root.unmount());dom.window.close();}
}
main().catch(e=>{console.error('Falha no carrinho:',e.message);process.exitCode=1;});
