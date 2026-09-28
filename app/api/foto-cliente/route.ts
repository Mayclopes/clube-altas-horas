import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 2 * 1024 * 1024;

async function verificarAdmin() {
  const cookieStore = await cookies();

  return sessaoAdminValida(
    cookieStore.get(COOKIE_ADMIN)?.value
  );
}

function codigoValido(codigo: string) {
  return /^AH\d{6}$/.test(codigo);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verificarAdmin())) {
      return NextResponse.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const formulario = await request.formData();

    const codigo = String(
      formulario.get("codigo") ?? ""
    ).trim().toUpperCase();

    const arquivo = formulario.get("foto");

    if (!codigoValido(codigo)) {
      return NextResponse.json(
        { erro: "Código inválido." },
        { status: 400 }
      );
    }

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { erro: "Selecione uma fotografia." },
        { status: 400 }
      );
    }

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!formatosPermitidos.includes(arquivo.type)) {
      return NextResponse.json(
        { erro: "Use uma imagem JPG, PNG ou WebP." },
        { status: 400 }
      );
    }

    if (
      arquivo.size === 0 ||
      arquivo.size > TAMANHO_MAXIMO
    ) {
      return NextResponse.json(
        { erro: "A fotografia deve ter até 2 MB." },
        { status: 400 }
      );
    }

    const clientes = await sql`
      SELECT foto_url
      FROM clientes_v2
      WHERE codigo = ${codigo}
      LIMIT 1
    `;

    if (clientes.length === 0) {
      return NextResponse.json(
        { erro: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const fotoAnterior =
      clientes[0].foto_url as string | null;

    const extensao =
      arquivo.type === "image/png"
        ? "png"
        : arquivo.type === "image/webp"
          ? "webp"
          : "jpg";

    const nomeArquivo =
      `clientes/${codigo}/${crypto.randomUUID()}.${extensao}`;

    const blob = await put(
      nomeArquivo,
      arquivo,
      {
        access: "public",
        addRandomSuffix: false,
      }
    );

    try {
      await sql`
        UPDATE clientes_v2
        SET
          foto_url = ${blob.url},
          atualizado_em = NOW()
        WHERE codigo = ${codigo}
      `;
    } catch (erro) {
      await del(blob.url).catch(console.error);
      throw erro;
    }

    if (fotoAnterior) {
      await del(fotoAnterior).catch(
        (erro) => console.error(
          "Não foi possível excluir a foto antiga:",
          erro
        )
      );
    }

    return NextResponse.json({
      sucesso: true,
      foto_url: blob.url,
    });
  } catch (erro) {
    console.error(
      "Erro ao enviar fotografia:",
      erro
    );

    return NextResponse.json(
      { erro: "Não foi possível salvar a fotografia." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await verificarAdmin())) {
      return NextResponse.json(
        { erro: "Não autorizado." },
        { status: 401 }
      );
    }

    const dados = await request.json();

    const codigo = String(
      dados.codigo ?? ""
    ).trim().toUpperCase();

    if (!codigoValido(codigo)) {
      return NextResponse.json(
        { erro: "Código inválido." },
        { status: 400 }
      );
    }

    const clientes = await sql`
      SELECT foto_url
      FROM clientes_v2
      WHERE codigo = ${codigo}
      LIMIT 1
    `;

    if (clientes.length === 0) {
      return NextResponse.json(
        { erro: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const foto =
      clientes[0].foto_url as string | null;

    await sql`
      UPDATE clientes_v2
      SET
        foto_url = NULL,
        atualizado_em = NOW()
      WHERE codigo = ${codigo}
    `;

    if (foto) {
      await del(foto).catch(
        (erro) => console.error(
          "Não foi possível excluir a fotografia:",
          erro
        )
      );
    }

    return NextResponse.json({
      sucesso: true,
    });
  } catch (erro) {
    console.error(
      "Erro ao remover fotografia:",
      erro
    );

    return NextResponse.json(
      { erro: "Não foi possível remover a fotografia." },
      { status: 500 }
    );
  }
}