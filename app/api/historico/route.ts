import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export async function GET() {
  const listaClientes = clientes as Cliente[];

  const historico = listaClientes.flatMap((cliente) =>
    cliente.historico.map((item) => ({
      codigo: cliente.codigo,
      nome: cliente.nome,
      data: item.data,
      pontos: item.pontos,
    }))
  );

  return NextResponse.json(historico);
}