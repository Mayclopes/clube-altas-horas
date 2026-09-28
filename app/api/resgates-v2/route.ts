import { sql } from "@/lib/db";
import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function autorizado() {
  const armazenamento = await cookies();

  return sessaoAdminValida(
    armazenamento.get(COOKIE_ADMIN)?.value
  );
}

function normalizarCodigo(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase();
}

export async function GET(request: Request) {
  try {
    if (!(await autorizado())) {
      return Response.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const codigo = normalizarCodigo(
      url.searchParams.get("codigo")
    );

    if (!/^AH\d{6}$/.test(codigo)) {
      return Response.json(
        { erro: "Código inválido." },
        { status: 400 }
      );
    }

    const clientes = await sql`
      SELECT
        codigo,
        nome,
        pontos,
        compras,
        ativo
      FROM clientes_v2
      WHERE codigo = ${codigo}
      LIMIT 1
    `;

    if (clientes.length === 0) {
      return Response.json(
        { erro: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const recompensas = await sql`
      SELECT
        id,
        nome,
        descricao,
        pontos,
        ativo
      FROM recompensas_v2
      WHERE ativo = TRUE
      ORDER BY pontos ASC, nome ASC
    `;

    return Response.json({
      cliente: clientes[0],
      recompensas,
    });
  } catch (erro) {
    console.error(
      "Erro ao consultar resgates:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível consultar as recompensas.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await autorizado())) {
      return Response.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const dados = await request.json();

    const codigo = normalizarCodigo(
      dados.codigo
    );

    const recompensaId = String(
      dados.recompensaId ?? ""
    ).trim();

    if (
      !/^AH\d{6}$/.test(codigo) ||
      !recompensaId
    ) {
      return Response.json(
        {
          erro:
            "Cliente ou recompensa inválidos.",
        },
        { status: 400 }
      );
    }

    const idMovimentacao =
      crypto.randomUUID();

    /*
      Uma única instrução SQL:

      1. Localiza uma recompensa ativa.
      2. Desconta os pontos somente se
         o cliente estiver ativo e tiver saldo.
      3. Registra a movimentação usando
         os valores retornados pelo UPDATE.

      A operação é atômica.
    */

    const resultado = await sql`
      WITH recompensa AS (
        SELECT
          id,
          nome,
          pontos
        FROM recompensas_v2
        WHERE id = ${recompensaId}
          AND ativo = TRUE
          AND pontos > 0
        LIMIT 1
      ),
      desconto AS (
        UPDATE clientes_v2 AS c
        SET
          pontos = c.pontos - r.pontos,
          atualizado_em = NOW()
        FROM recompensa AS r
        WHERE c.codigo = ${codigo}
          AND c.ativo = TRUE
          AND c.pontos >= r.pontos
        RETURNING
          c.codigo,
          c.pontos AS saldo_novo,
          r.id AS recompensa_id,
          r.nome AS recompensa_nome,
          r.pontos AS pontos_resgatados
      ),
      registro AS (
        INSERT INTO movimentacoes_v2 (
          id,
          cliente_codigo,
          tipo,
          descricao,
          pontos,
          saldo_anterior,
          saldo_novo,
          produto_id,
          quantidade
        )
        SELECT
          ${idMovimentacao},
          d.codigo,
          'RESGATE',
          'Resgate: ' || d.recompensa_nome,
          -d.pontos_resgatados,
          d.saldo_novo + d.pontos_resgatados,
          d.saldo_novo,
          NULL,
          1
        FROM desconto AS d
        RETURNING
          id,
          cliente_codigo,
          descricao,
          pontos,
          saldo_anterior,
          saldo_novo
      )
      SELECT
        id,
        cliente_codigo,
        descricao,
        pontos,
        saldo_anterior,
        saldo_novo
      FROM registro
    `;

    if (resultado.length === 0) {
      return Response.json(
        {
          erro:
            "Resgate não realizado. Confira se o cliente está ativo, se possui pontos suficientes e se a recompensa está disponível.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        sucesso: true,
        mensagem:
          "Recompensa resgatada com sucesso.",
        movimentacao: resultado[0],
      },
      { status: 201 }
    );
  } catch (erro) {
    console.error(
      "Erro ao realizar resgate:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível realizar o resgate.",
      },
      { status: 500 }
    );
  }
}