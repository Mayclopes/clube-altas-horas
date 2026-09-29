import { createHash } from "crypto";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, sessaoAdminValida } from "@/lib/auth";
import { sql } from "@/lib/db";
import { financeiroDisponivel } from "@/lib/financeiro/disponibilidade";
import { normalizarPedido, payloadCanonico } from "@/lib/financeiro/pedido";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX_PAYLOAD = 32 * 1024;
async function lerPedido(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_PAYLOAD) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > MAX_PAYLOAD) { await reader.cancel(); throw new RangeError(); }
      partes.push(value);
    }
  } finally { reader.releaseLock(); }
  return normalizarPedido(JSON.parse(Buffer.concat(partes).toString("utf8")));
}
const erros: Record<string, [number, string]> = {
  P2001: [404, "Cliente não encontrado."], P2002: [403, "Cliente inativo."],
  P2003: [409, "Produto inexistente, inativo ou com pontos inválidos."],
  P2004: [409, "Produto sem preço. Atualize o catálogo antes da venda."],
  P2005: [400, "O desconto não pode superar o subtotal."],
  P2006: [400, "Pedido inválido."], P2007: [409, "Chave já utilizada para outro pedido."],
  P2008: [409, "A venda excede os limites de pontos ou compras."],
  P2009: [409, "Operação ainda não concluída. Repita o mesmo pedido com a mesma chave."],
};
export async function POST(request: Request) {
  const sessao = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!sessaoAdminValida(sessao)) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  let pedido;
  try { pedido = await lerPedido(request); }
  catch (erro) { return Response.json({ erro: erro instanceof RangeError ? "Pedido excede o limite de 32 KiB." : "Pedido inválido. Confira cliente, itens, quantidades, desconto e chave.", podeEditar: true }, { status: erro instanceof RangeError ? 413 : 400 }); }
  try {
    if (!(await financeiroDisponivel())) return Response.json({ erro: "Registro financeiro ainda não ativado." }, { status: 503 });
    const hash = createHash("sha256").update(payloadCanonico(pedido)).digest("hex");
    const [resultado] = await sql`
      SELECT public.registrar_venda_v2(${pedido.codigo}, ${JSON.stringify(pedido.itens)}::jsonb,
        ${pedido.descontoCentavos}::bigint, ${pedido.chave}, ${hash}) AS resposta
    `;
    return Response.json(resultado.resposta, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : "";
    const [status, mensagem] = erros[codigo] ?? [500, "Não foi possível confirmar a venda. Repita com a mesma chave para conferir o resultado sem duplicar."];
    // Não registrar payload, dados pessoais, conexão ou erro bruto.
    return Response.json({ erro: mensagem, podeEditar: Boolean(erros[codigo]) && codigo !== "P2007" && codigo !== "P2009" }, { status });
  }
}
