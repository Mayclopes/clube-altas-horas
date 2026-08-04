import { NextResponse } from "next/server";
import { buscarCliente } from "@/lib/clientes";

type Context = {
  params: Promise<{
    codigo: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Context
) {

  const { codigo } = await params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {

    return NextResponse.json(

      { erro: "Cliente não encontrado" },

      { status: 404 }

    );

  }

  return NextResponse.json(
    cliente.historico
  );

}