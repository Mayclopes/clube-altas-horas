import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export async function GET() {
  const listaClientes = clientes as Cliente[];

  const ranking = [...listaClientes]
    .sort((a, b) => b.pontos - a.pontos)
    .map((cliente, index) => ({
      posicao: index + 1,
      codigo: cliente.codigo,
      nome: cliente.nome,
      pontos: cliente.pontos,
    }));

  return NextResponse.json(ranking);
}