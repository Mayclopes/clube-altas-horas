import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";

export async function GET() {
  return NextResponse.json(clientes);
}