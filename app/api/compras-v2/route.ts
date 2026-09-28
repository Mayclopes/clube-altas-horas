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

    const pontosProduto =
      Number(produto.pontos);

    const pontosGanhos =
      pontosProduto * quantidade;

    const saldoAnterior =
      Number(cliente.pontos);

    const saldoNovo =
      saldoAnterior + pontosGanhos;

    const comprasAnteriores =
      Number(cliente.compras);

    const novoTotalCompras =
      comprasAnteriores + 1;

    const movimentacaoId =
      crypto.randomUUID();

    const descricao =
      quantidade === 1
        ? `Compra: ${produto.nome}`
        : `Compra: ${quantidade}x ${produto.nome}`;

    await sql.transaction([
      sql`
        UPDATE clientes_v2
        SET
          pontos = ${saldoNovo},
          compras = ${novoTotalCompras},
          atualizado_em = NOW()
        WHERE codigo = ${codigo}
      `,

      sql`
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
        VALUES (
          ${movimentacaoId},
          ${codigo},
          'COMPRA',
          ${descricao},
          ${pontosGanhos},
          ${saldoAnterior},
          ${saldoNovo},
          ${produto.id},
          ${quantidade}
        )
      `,
    ]);

    return Response.json(
      {
        sucesso: true,

        mensagem:
          "Compra registrada com sucesso.",

        compra: {
          cliente: codigo,
          produto: produto.nome,
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