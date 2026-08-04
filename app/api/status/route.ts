import { NextResponse } from "next/server";
import clientes from "@/data/clientes.json";

export async function GET() {

  return NextResponse.json({

    sistema: "Online",

    banco: "OK",

    clientes: clientes.length,

    versao: "1.0.0"

  });

}