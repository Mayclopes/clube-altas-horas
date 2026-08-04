import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";

export async function GET() {

  const totalClientes = clientes.length;

  const totalCompras = clientes.reduce(
    (total, cliente) => total + cliente.compras,
    0
  );

  const totalPontos = clientes.reduce(
    (total, cliente) => total + cliente.pontos,
    0
  );

  return NextResponse.json({

    totalClientes,

    totalCompras,

    totalPontos

  });

}