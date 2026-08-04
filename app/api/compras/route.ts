import { NextResponse } from "next/server";
import {
  listarClientes,
  salvarClientes
} from "@/lib/clientes";

export async function POST(
  request: Request
) {

  const { codigo } = await request.json();

  const clientes = listarClientes();

  const indice = clientes.findIndex(
    (cliente) => cliente.codigo === codigo
  );

  if (indice === -1) {

    return NextResponse.json(
      {
        erro: "Cliente não encontrado."
      },
      {
        status: 404
      }
    );

  }

  clientes[indice].compras++;

  clientes[indice].pontos++;

  clientes[indice].historico.push({
    data: new Date().toISOString(),
    pontos: 1
  });

  salvarClientes(clientes);

  return NextResponse.json(
    clientes[indice]
  );

}