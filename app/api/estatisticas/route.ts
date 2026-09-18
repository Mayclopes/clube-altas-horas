import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";
import type { Cliente } from "@/types/cliente";

export async function GET() {
  const listaClientes = clientes as Cliente[];

  const totalClientes = listaClientes.length;

  const totalCompras = listaClientes.reduce(
    (total, cliente) => total + cliente.compras,
    0
  );

  const totalPontos = listaClientes.reduce(
    (total, cliente) => total + cliente.pontos,
    0
  );

  return NextResponse.json({
    totalClientes,
    totalCompras,
    totalPontos,
  });
}