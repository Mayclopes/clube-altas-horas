import { NextResponse } from "next/server";

export async function GET() {

  return NextResponse.json([

    {

      nome: "Cerveja Long Neck",

      pontos: 10

    },

    {

      nome: "Dose de Whisky",

      pontos: 25

    },

    {

      nome: "Combo Especial",

      pontos: 50

    }

  ]);

}