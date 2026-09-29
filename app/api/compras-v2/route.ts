import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    const dados =
      await request.json();

    const codigo = String(
      dados.codigo || ""
    )
      .trim()
      .toUpperCase();

    const produtoId = String(
      dados.produtoId || ""
    ).trim();

    const quantidade = Number(
      dados.quantidade
    );

    if (!/^AH\d{6}$/.test(codigo)) {
      return Response.json(
        {
          erro:
            "Código do cliente inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!produtoId) {
      return Response.json(
        {
          erro:
            "Produto não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0 ||
      quantidade > 100
    ) {
      return Response.json(
        {
          erro:
            "Quantidade inválida.",
        },
        {
          status: 400,
        }
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
        {
          erro:
            "Cliente não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const cliente = clientes[0];

    if (!cliente.ativo) {
      return Response.json(
        {
          erro:
            "Cliente inativo.",
        },
        {
          status: 403,
        }
      );
    }

    const produtos = await sql`
      SELECT
        id,
        nome,
        pontos,
        ativo
      FROM produtos_v2
      WHERE id = ${produtoId}
      LIMIT 1
    `;

    if (produtos.length === 0) {
      return Response.json(
        {
          erro:
            "Produto não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const produto = produtos[0];

    if (!produto.ativo) {
      return Response.json(
        {
          erro:
            "Produto inativo.",
        },
        {
          status: 400,
        }
      );
    }

    const movimentacaoId = crypto.randomUUID();

    // Uma instrução: incremento sobre a linha bloqueada e histórico derivado
    // do RETURNING. COMPRA e RESGATE serializam no mesmo cliente; falha no
    // INSERT desfaz também o UPDATE. Não usar saldos lidos antes da operação.
    const resultado = await sql`
      WITH produto AS (
        SELECT id, nome, pontos
        FROM produtos_v2
        WHERE id = ${produtoId} AND ativo = TRUE
        FOR SHARE
      ), credito AS (
        UPDATE clientes_v2 AS c
        SET pontos = c.pontos + p.pontos * ${quantidade},
            compras = c.compras + 1,
            atualizado_em = NOW()
        FROM produto p
        WHERE c.codigo = ${codigo} AND c.ativo = TRUE
        RETURNING c.codigo, c.pontos AS saldo_novo, c.compras,
          p.id AS produto_id, p.nome AS produto_nome,
          p.pontos * ${quantidade} AS pontos_ganhos
      ), registro AS (
        INSERT INTO movimentacoes_v2 (
          id, cliente_codigo, tipo, descricao, pontos,
          saldo_anterior, saldo_novo, produto_id, quantidade
        )
        SELECT ${movimentacaoId}, codigo, 'COMPRA',
          CASE WHEN ${quantidade} = 1 THEN 'Compra: ' || produto_nome
            ELSE 'Compra: ' || ${quantidade}::text || 'x ' || produto_nome END,
          pontos_ganhos, saldo_novo - pontos_ganhos, saldo_novo,
          produto_id, ${quantidade}
        FROM credito
        RETURNING id
      )
      SELECT credito.* FROM credito CROSS JOIN registro
    `;

    if (resultado.length === 0) {
      return Response.json(
        { erro: "Compra não registrada. Confira se o cliente e o produto continuam ativos." },
        { status: 409 }
      );
    }

    const compraRegistrada = resultado[0];
    const pontosGanhos = Number(compraRegistrada.pontos_ganhos);
    const saldoNovo = Number(compraRegistrada.saldo_novo);
    const saldoAnterior = saldoNovo - pontosGanhos;
    const novoTotalCompras = Number(compraRegistrada.compras);

    return Response.json(
      {
        sucesso: true,

        mensagem:
          "Compra registrada com sucesso.",

        compra: {
          cliente: codigo,
          produto: compraRegistrada.produto_nome,
          quantidade,
          pontosGanhos,
          saldoAnterior,
          saldoNovo,
          compras:
            novoTotalCompras,
        },
      },
      {
        status: 201,
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao registrar compra:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível registrar a compra.",
      },
      {
        status: 500,
      }
    );
  }
}