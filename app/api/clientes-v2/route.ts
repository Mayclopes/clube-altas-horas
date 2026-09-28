import { sql } from "@/lib/db";
import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function codigoValido(codigo: string) {
  return /^AH\d{6}$/.test(codigo);
}

function dataValida(
  valor: string | null
) {
  if (valor === null) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [ano, mes, dia] =
    valor.split("-").map(Number);

  const data = new Date(
    Date.UTC(ano, mes - 1, dia)
  );

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function lerNascimento(
  valor: unknown
): string | null {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  return String(valor).trim();
}

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    const codigo = String(
      dados.codigo ?? ""
    ).trim().toUpperCase();

    const nome = String(
      dados.nome ?? ""
    ).trim();

    const whatsapp = String(
      dados.whatsapp ?? ""
    ).trim();

    const nascimento =
      lerNascimento(dados.nascimento);

    if (!codigoValido(codigo)) {
      return Response.json(
        {
          erro: "Código do chaveiro inválido.",
        },
        { status: 400 }
      );
    }

    if (!nome || !whatsapp) {
      return Response.json(
        {
          erro:
            "Nome e WhatsApp são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (!dataValida(nascimento)) {
      return Response.json(
        {
          erro: "Data de nascimento inválida.",
        },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    const resultado = await sql`
      INSERT INTO clientes_v2 (
        id,
        codigo,
        nome,
        whatsapp,
        nascimento,
        pontos,
        compras,
        ativo
      )
      VALUES (
        ${id},
        ${codigo},
        ${nome},
        ${whatsapp},
        ${nascimento},
        0,
        0,
        TRUE
      )
      ON CONFLICT (codigo)
      DO NOTHING
      RETURNING
        id,
        codigo,
        nome,
        whatsapp,
        pontos,
        compras,
        ativo
    `;

    if (resultado.length === 0) {
      return Response.json(
        {
          erro:
            "Este chaveiro já está cadastrado.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        sucesso: true,
        mensagem:
          "Cliente cadastrado com sucesso.",
        cliente: resultado[0],
      },
      { status: 201 }
    );
  } catch (erro) {
    console.error(
      "Erro ao cadastrar cliente:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível cadastrar o cliente.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();

    const sessao = cookieStore.get(
      COOKIE_ADMIN
    )?.value;

    if (!sessaoAdminValida(sessao)) {
      return Response.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const dados = await request.json();

    const codigo = String(
      dados.codigo ?? ""
    ).trim().toUpperCase();

    const nome = String(
      dados.nome ?? ""
    ).trim();

    const whatsapp = String(
      dados.whatsapp ?? ""
    ).trim();

    const nascimento =
      lerNascimento(dados.nascimento);

    const ativo = dados.ativo;

    const observacao = String(
      dados.observacao_inatividade ?? ""
    ).trim();

    if (!codigoValido(codigo)) {
      return Response.json(
        {
          erro: "Código do cliente inválido.",
        },
        { status: 400 }
      );
    }

    if (!nome || !whatsapp) {
      return Response.json(
        {
          erro:
            "Nome e WhatsApp são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (!dataValida(nascimento)) {
      return Response.json(
        {
          erro: "Data de nascimento inválida.",
        },
        { status: 400 }
      );
    }

    if (typeof ativo !== "boolean") {
      return Response.json(
        {
          erro: "Status inválido.",
        },
        { status: 400 }
      );
    }

    if (observacao.length > 300) {
      return Response.json(
        {
          erro:
            "O motivo deve ter no máximo 300 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!ativo && !observacao) {
      return Response.json(
        {
          erro:
            "Informe o motivo da inativação.",
        },
        { status: 400 }
      );
    }

    const resultado = await sql`
      UPDATE clientes_v2
      SET
        nome = ${nome},
        whatsapp = ${whatsapp},
        nascimento = ${nascimento},
        ativo = ${ativo},
        observacao_inatividade =
          CASE
            WHEN ${ativo} = FALSE
            THEN ${observacao}
            ELSE observacao_inatividade
          END,
        atualizado_em = NOW()
      WHERE codigo = ${codigo}
      RETURNING
        id,
        codigo,
        nome,
        whatsapp,
        TO_CHAR(
          nascimento,
          'YYYY-MM-DD'
        ) AS nascimento,
        pontos,
        compras,
        ativo,
        observacao_inatividade
    `;

    if (resultado.length === 0) {
      return Response.json(
        {
          erro: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      sucesso: true,
      mensagem:
        "Cliente atualizado com sucesso.",
      cliente: resultado[0],
    });
  } catch (erro) {
    console.error(
      "Erro ao atualizar cliente:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível atualizar o cliente.",
      },
      { status: 500 }
    );
  }
}