import { sql } from "@/lib/db";

import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Somente administradores podem
    // pesquisar os dados dos clientes.

    const armazenamento = await cookies();

    const sessao = armazenamento.get(
      COOKIE_ADMIN
    )?.value;

    if (!sessaoAdminValida(sessao)) {
      return Response.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const termo = (
      url.searchParams.get("q") ?? ""
    ).trim();

    if (termo.length < 2) {
      return Response.json({
        clientes: [],
      });
    }

    if (termo.length > 100) {
      return Response.json(
        {
          erro:
            "A pesquisa deve ter no máximo 100 caracteres.",
        },
        { status: 400 }
      );
    }

    const numeros = termo.replace(
      /\D/g,
      ""
    );

    const clientes = await sql`
      SELECT
        codigo,
        nome,
        whatsapp,
        pontos,
        compras,
        ativo
      FROM clientes_v2
      WHERE
        POSITION(
          LOWER(${termo})
          IN LOWER(nome)
        ) > 0

        OR POSITION(
          LOWER(${termo})
          IN LOWER(codigo)
        ) > 0

        OR (
          ${numeros} <> ''
          AND POSITION(
            ${numeros}
            IN REGEXP_REPLACE(
              whatsapp,
              '[^0-9]',
              '',
              'g'
            )
          ) > 0
        )

      ORDER BY
        CASE
          WHEN LOWER(codigo) =
            LOWER(${termo})
          THEN 0

          WHEN LOWER(nome) =
            LOWER(${termo})
          THEN 1

          ELSE 2
        END,
        nome ASC

      LIMIT 20
    `;

    return Response.json({
      clientes,
    });
  } catch (erro) {
    console.error(
      "Erro na pesquisa de clientes:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível pesquisar os clientes.",
      },
      { status: 500 }
    );
  }
}