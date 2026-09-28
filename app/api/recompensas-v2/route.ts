import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recompensas = await sql`
      SELECT
        id,
        nome,
        descricao,
        pontos,
        ativo
      FROM recompensas_v2
      ORDER BY id
    `;

    return Response.json(recompensas);
  } catch (erro) {
    console.error(
      "Erro ao buscar recompensas:",
      erro
    );

    return Response.json(
      {
        erro: "Não foi possível buscar as recompensas.",
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
          erro: "ID da recompensa não informado.",
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
          erro: "Nome da recompensa inválido.",
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
          erro: "Status da recompensa inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const resultado = await sql`
      UPDATE recompensas_v2
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
          erro: "Recompensa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      sucesso: true,
      mensagem:
        "Recompensa atualizada com sucesso.",
      recompensa: resultado[0],
    });
  } catch (erro) {
    console.error(
      "Erro ao atualizar recompensa:",
      erro
    );

    return Response.json(
      {
        erro: "Não foi possível atualizar a recompensa.",
      },
      {
        status: 500,
      }
    );
  }
}