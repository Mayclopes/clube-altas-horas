import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const produtos = await sql`
      SELECT
        id,
        nome,
        descricao,
        pontos,
        ativo
      FROM produtos_v2
      ORDER BY id
    `;

    return Response.json(produtos);
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

    const resultado = await sql`
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
        ativo
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