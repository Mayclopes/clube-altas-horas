import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";

export async function GET() {

  const historico = clientes.flatMap(cliente =>

    cliente.historico.map(item => ({

      codigo: cliente.codigo,

      nome: cliente.nome,

      data: item.data,

      pontos: item.pontos

    }))

  );

  return NextResponse.json(historico);

}