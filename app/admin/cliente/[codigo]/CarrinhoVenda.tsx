"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Produto } from "@/types/produto";
import { formatarDinheiro, reaisParaCentavos } from "@/lib/financeiro/dinheiro";
import { normalizarPedido, type PedidoVenda } from "@/lib/financeiro/pedido";

type Props = { codigo: string; produtos: Produto[] };
export default function CarrinhoVenda({ codigo, produtos }: Props) {
  const router = useRouter();
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [desconto, setDesconto] = useState("0,00");
  const [pendente, setPendente] = useState<PedidoVenda | null>(null);
  const [pronto, setPronto] = useState(false);
  const [recuperacaoFalhou, setRecuperacaoFalhou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const bloqueio = useRef(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const storageKey = `clube-venda-pendente-${codigo}`;

  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(storageKey);
      if (salvo) {
        const pedido = normalizarPedido(JSON.parse(salvo));
        if (pedido.codigo !== codigo) throw new Error("Cliente da confirmação divergente.");
        if (pedido.codigo === codigo) {
          setPendente(pedido);
          setQuantidades(Object.fromEntries(pedido.itens.map(i => [i.produtoId, i.quantidade])));
          const centavos = BigInt(pedido.descontoCentavos);
          setDesconto(`${centavos / BigInt(100)},${(centavos % BigInt(100)).toString().padStart(2, "0")}`);
          setErro("Existe uma confirmação pendente. Confira o resultado repetindo a mesma venda; a chave evita duplicidade.");
        }
      }
    } catch { setRecuperacaoFalhou(true); setErro("Não foi possível recuperar a confirmação pendente. Confira o histórico e a configuração de armazenamento desta aba antes de registrar uma nova venda."); }
    setPronto(true);
  }, [codigo, storageKey]);

  const itens = produtos.filter(p => (quantidades[p.id] ?? 0) > 0);
  const subtotal = itens.reduce((s, p) => s + BigInt(p.preco_centavos ?? "0") * BigInt(quantidades[p.id]), BigInt(0));
  const pontos = itens.reduce((s, p) => s + p.pontos * quantidades[p.id], 0);
  let descontoCentavos = "0";
  let descontoValido = true;
  try { descontoCentavos = reaisParaCentavos(desconto); descontoValido = BigInt(descontoCentavos) <= subtotal; }
  catch { descontoValido = false; }
  const total = descontoValido ? subtotal - BigInt(descontoCentavos) : null;
  const travado = enviando || pendente !== null || !pronto || recuperacaoFalhou;
  function quantidade(id: string, valor: number) {
    if (travado) return;
    setQuantidades(atual => ({ ...atual, [id]: Math.max(0, Math.min(100, valor)) }));
    setErro(""); setMensagem("");
  }
  async function confirmar() {
    if (bloqueio.current || !pronto || recuperacaoFalhou) return;
    if (!pendente && (!itens.length || !descontoValido)) return;
    bloqueio.current = true; setEnviando(true); setErro(""); setMensagem("");
    let pedido = pendente;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      if (!pedido) {
        pedido = normalizarPedido({ codigo, itens: itens.map(p => ({ produtoId: p.id, quantidade: quantidades[p.id] })), descontoCentavos, chave: crypto.randomUUID() });
        // Salvar ANTES do envio: reload/retry recuperam exatamente a mesma intenção.
        sessionStorage.setItem(storageKey, JSON.stringify(pedido));
        setPendente(pedido);
      }
      const resposta = await fetch("/api/vendas-v2", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify(pedido), signal: controller.signal,
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        if (dados.podeEditar === true) {
          sessionStorage.removeItem(storageKey); setPendente(null);
        }
        throw new Error(dados.erro ?? "Não foi possível confirmar. Tente novamente com a mesma chave.");
      }
      sessionStorage.removeItem(storageKey);
      setPendente(null); setQuantidades({}); setDesconto("0,00");
      setMensagem(`Venda ${dados.venda.id} registrada: ${formatarDinheiro(dados.venda.total_centavos)} e +${dados.venda.pontos} pontos. Saldo: ${dados.venda.saldoNovo}.`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error && e.name !== "AbortError" && !(e instanceof TypeError) ? e.message : "Sem confirmação do servidor. Repita a mesma confirmação para conferir sem duplicar.");
    } finally { clearTimeout(timeout); bloqueio.current = false; setEnviando(false); }
  }

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold">Registrar venda</h2>
      <p className="text-sm text-zinc-400">Adicione produtos ao carrinho. Preços e pontos são confirmados no servidor.</p>
      {!produtos.length && <p className="rounded-xl bg-zinc-900 p-5">Nenhum produto ativo.</p>}
      {produtos.map(p => {
        const q = quantidades[p.id] ?? 0;
        const semPreco = p.preco_centavos == null;
        return (
          <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="break-words text-lg font-bold">{p.nome}</h3>
            <p className="mt-2 text-zinc-400">{semPreco ? "Sem preço configurado — configure em Produtos" : formatarDinheiro(p.preco_centavos!)} · {p.pontos} pontos/un.</p>
            {q > 0 ? <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" aria-label={`Diminuir ${p.nome}`} disabled={travado} onClick={() => quantidade(p.id, q - 1)} className="rounded-lg bg-zinc-700 px-4 py-2 disabled:opacity-40">−</button>
                <span aria-label="Quantidade">{q}</span>
                <button type="button" aria-label={`Aumentar ${p.nome}`} disabled={travado || q >= 100} onClick={() => quantidade(p.id, q + 1)} className="rounded-lg bg-zinc-700 px-4 py-2 disabled:opacity-40">+</button>
                <button type="button" disabled={travado} onClick={() => quantidade(p.id, 0)} className="ml-auto text-red-400 disabled:opacity-40">Remover</button>
              </div>
              <p className="mt-3">Subtotal: {formatarDinheiro(BigInt(p.preco_centavos ?? "0") * BigInt(q))} · {p.pontos * q} pontos</p>
            </> : <button type="button" disabled={travado || semPreco || itens.length >= 30} onClick={() => quantidade(p.id, 1)} className="mt-4 w-full rounded-xl bg-red-600 p-3 font-bold disabled:bg-zinc-700 disabled:text-zinc-500">Adicionar</button>}
          </div>
        );
      })}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
        <p>Subtotal: <strong>{formatarDinheiro(subtotal)}</strong></p>
        <label htmlFor="desconto-venda" className="mt-4 block text-zinc-400">Desconto sobre a venda (R$)</label>
        <input id="desconto-venda" type="text" inputMode="decimal" value={desconto} disabled={travado}
          onChange={e => setDesconto(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 disabled:opacity-50" />
        {!descontoValido && <p className="mt-2 text-red-400">Use até duas casas decimais e desconto até o subtotal.</p>}
        <p className="mt-4 text-2xl font-bold text-red-400">Total: {total === null ? "—" : formatarDinheiro(total)}</p>
        <p className="mt-2">Pontos a receber: <strong>{pontos}</strong></p>
        {pendente && <p className="mt-4 text-sm text-amber-300">Pedido bloqueado para conferir o resultado. A repetição usa a mesma chave, mesmo após recarregar esta aba.</p>}
        <button type="button" onClick={confirmar} disabled={enviando || !pronto || recuperacaoFalhou || (!pendente && (!itens.length || !descontoValido))}
          className="mt-5 w-full rounded-xl bg-red-600 py-4 font-bold disabled:bg-zinc-700 disabled:text-zinc-500">
          {enviando ? "Confirmando..." : pendente ? "CONFERIR / REPETIR CONFIRMAÇÃO" : "CONFIRMAR VENDA"}
        </button>
      </div>
      {erro && <p role="alert" className="rounded-xl bg-red-950 p-4 text-red-300">{erro}</p>}
      {mensagem && <p role="status" className="break-words rounded-xl bg-green-950 p-4 text-green-300">{mensagem}</p>}
    </section>
  );
}
