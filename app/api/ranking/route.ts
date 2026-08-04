import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";

export async function GET() {

  const ranking = [...clientes]

    .sort((a, b) => b.pontos - a.pontos)

    .map((cliente, index) => ({

      posicao: index + 1,

      codigo: cliente.codigo,

      nome: cliente.nome,

      pontos: cliente.pontos,

      compras: cliente.compras

    }));

  return NextResponse.json(ranking);

}