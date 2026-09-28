import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ADMIN } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set({
      name: COOKIE_ADMIN,
      value: "",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Logout realizado com sucesso.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao realizar logout:",
      erro
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Não foi possível realizar o logout.",
      },
      {
        status: 500,
      }
    );
  }
}