export type ItemPedido = { produtoId: string; quantidade: number };
export type PedidoVenda = { codigo: string; itens: ItemPedido[]; descontoCentavos: string; chave: string };
export function normalizarPedido(valor: unknown): PedidoVenda {
  if (!valor || typeof valor !== "object") throw new Error("Pedido inválido.");
  const dados = valor as Record<string, unknown>;
  const codigo = typeof dados.codigo === "string" ? dados.codigo.trim().toUpperCase() : "";
  if (!/^AH\d{6}$/.test(codigo)) throw new Error("Código inválido.");
  if (typeof dados.chave !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(dados.chave)) throw new Error("Chave de idempotência inválida.");
  if (typeof dados.descontoCentavos !== "string" || !/^\d{1,16}$/.test(dados.descontoCentavos) || BigInt(dados.descontoCentavos) > BigInt("9007199254740991")) throw new Error("Desconto inválido.");
  if (!Array.isArray(dados.itens) || dados.itens.length < 1 || dados.itens.length > 30) throw new Error("Selecione de 1 a 30 produtos.");
  const ids = new Set<string>();
  const itens = dados.itens.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Item inválido.");
    const p = item as Record<string, unknown>;
    if (typeof p.produtoId !== "string" || !p.produtoId.trim() || p.produtoId.length > 100 || ids.has(p.produtoId.trim())) throw new Error("Produto inválido ou repetido.");
    if (typeof p.quantidade !== "number" || !Number.isInteger(p.quantidade) || p.quantidade < 1 || p.quantidade > 100) throw new Error("Use de 1 a 100 unidades por produto.");
    ids.add(p.produtoId.trim());
    return { produtoId: p.produtoId.trim(), quantidade: p.quantidade };
  }).sort((a, b) => a.produtoId < b.produtoId ? -1 : a.produtoId > b.produtoId ? 1 : 0);
  // Preços/pontos extras do navegador não são utilizados.
  return { codigo, itens, descontoCentavos: BigInt(dados.descontoCentavos).toString(), chave: dados.chave };
}
export function payloadCanonico(pedido: PedidoVenda): string {
  return JSON.stringify({ codigo: pedido.codigo, itens: pedido.itens, descontoCentavos: pedido.descontoCentavos });
}
