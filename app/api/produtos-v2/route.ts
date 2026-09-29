import { sql } from "@/lib/db";
import { financeiroDisponivel } from "@/lib/financeiro/disponibilidade";
import { MAX_PRECO } from "@/lib/financeiro/dinheiro";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const produtos = await sql`
      SELECT
        id,
        nome,
        descricao,
        pontos,
        ativo,
        to_jsonb(p)->>'preco_centavos' AS preco_centavos
      FROM produtos_v2 p
      ORDER BY id
    `;

    return Response.json(produtos, { headers: { "X-Financeiro-Disponivel": String(await financeiroDisponivel()) } });
  } catch (erro) {
    console.error(
      "Erro ao buscar produtos:",
      erro
    );

    return Response.json(
      {
        erro: "Não foi possível buscar os produtos.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dados = await request.json();

    if (!dados.id) {
      return Response.json(
        {
          erro: "ID do produto não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof dados.nome !== "string" ||
      dados.nome.trim().length === 0
    ) {
      return Response.json(
        {
          erro: "Nome do produto inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof dados.pontos !== "number" ||
      dados.pontos < 0
    ) {
      return Response.json(
        {
          erro: "Quantidade de pontos inválida.",
        },
        {
          status: 400,
        }
      );
    }

    if (typeof dados.ativo !== "boolean") {
      return Response.json(
        {
          erro: "Status do produto inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const alteraPreco = Object.hasOwn(dados, "preco_centavos");
    if (alteraPreco && !(await financeiroDisponivel())) {
      return Response.json({ erro: "Preços financeiros ainda não ativados." }, { status: 409 });
    }
    if (alteraPreco && dados.preco_centavos !== null &&
      (typeof dados.preco_centavos !== "string" || !/^\d{1,10}$/.test(dados.preco_centavos) || BigInt(dados.preco_centavos) > MAX_PRECO)) {
      return Response.json({ erro: "Preço inválido." }, { status: 400 });
    }
    if (!Number.isInteger(dados.pontos) || dados.pontos > 2147483647) {
      return Response.json({ erro: "Informe pontos inteiros dentro do limite permitido." }, { status: 400 });
    }
    const resultado = alteraPreco ? await sql`
      UPDATE produtos_v2 SET nome = ${dados.nome.trim()}, pontos = ${dados.pontos},
        ativo = ${dados.ativo}, preco_centavos = ${dados.preco_centavos}::bigint
      WHERE id = ${dados.id}
      RETURNING id, nome, descricao, pontos, ativo, preco_centavos::text AS preco_centavos
    ` : await sql`
      UPDATE produtos_v2
      SET
        nome = ${dados.nome.trim()},
        pontos = ${dados.pontos},
        ativo = ${dados.ativo}
      WHERE id = ${dados.id}
      RETURNING
        id,
        nome,
        descricao,
        pontos,
        ativo,
        to_jsonb(produtos_v2)->>'preco_centavos' AS preco_centavos
    `;

    if (resultado.length === 0) {
      return Response.json(
        {
          erro: "Produto não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      sucesso: true,
      mensagem:
        "Produto atualizado com sucesso.",
      produto: resultado[0],
    });
  } catch (erro) {
    console.error(
      "Erro ao atualizar produto:",
      erro
    );

    return Response.json(
      {
        erro: "Não foi possível atualizar o produto.",
      },
      {
        status: 500,
      }
    );
  }
}
