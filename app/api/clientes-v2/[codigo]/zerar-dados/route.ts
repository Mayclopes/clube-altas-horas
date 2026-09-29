import { cookies } from "next/headers";
import { COOKIE_ADMIN, senhaAdminValida, sessaoAdminValida } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ codigo: string }> }) {
  const sessao = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!sessaoAdminValida(sessao)) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const { codigo: codigoBruto } = await context.params;
  const codigo = codigoBruto.trim().toUpperCase();
  if (!/^AH\d{6}$/.test(codigo)) return Response.json({ erro: "Código inválido." }, { status: 400 });
  let dados: { senha?: unknown; confirmacao?: unknown };
  try { dados = await request.json(); } catch { return Response.json({ erro: "Confirmação inválida." }, { status: 400 }); }
  if (dados.confirmacao !== `ZERAR ${codigo}`) return Response.json({ erro: "Digite a confirmação solicitada." }, { status: 400 });
  if (!senhaAdminValida(dados.senha)) return Response.json({ erro: "Senha administrativa inválida." }, { status: 401 });
  try {
    const [resultado] = await sql`SELECT public.limpar_dados_cliente_v2(${codigo}) AS resultado`;
    return Response.json(resultado.resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    const codigoErro = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : "";
    if (codigoErro === "P2001") return Response.json({ erro: "Cliente não encontrado." }, { status: 404 });
    if (codigoErro === "P2011") return Response.json({ erro: "Não foi possível limpar referências relacionadas com segurança." }, { status: 409 });
    return Response.json({ erro: "Não foi possível zerar os dados. Nenhuma alteração parcial foi confirmada." }, { status: 500 });
  }
}
