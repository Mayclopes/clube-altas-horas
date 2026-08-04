import { NextResponse } from "next/server";
import { buscarCliente } from "@/lib/clientes";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      codigo: string;
    }>;
  }
) {
  const { codigo } = await context.params;

  const cliente = buscarCliente(codigo);

  if (!cliente) {
    return NextResponse.json(
      {
        erro: "Cliente não encontrado",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(cliente);
}