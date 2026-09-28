import { cookies } from "next/headers";
import {
  criarSessaoAdmin,
  credenciaisAdminValidas,
  COOKIE_ADMIN,
  DURACAO_SESSAO_SEGUNDOS,
} from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    const usuario = String(
      dados.usuario || ""
    );

    const senha = String(
      dados.senha || ""
    );

    if (
      !credenciaisAdminValidas(
        usuario,
        senha
      )
    ) {
      return NextResponse.json(
        {
          erro: "Login inválido.",
        },
        {
          status: 401,
        }
      );
    }

    const sessao = criarSessaoAdmin();

    const cookieStore = await cookies();

    cookieStore.set({
      name: COOKIE_ADMIN,
      value: sessao,
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DURACAO_SESSAO_SEGUNDOS,
    });

    return NextResponse.json({
      sucesso: true,
    });
  } catch (erro) {
    console.error(
      "Erro no login:",
      erro
    );

    return NextResponse.json(
      {
        erro: "Dados inválidos.",
      },
      {
        status: 400,
      }
    );
  }
}