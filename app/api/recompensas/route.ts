import { NextResponse } from "next/server";

function rotaV1Desativada() {
  return NextResponse.json(
    {
      erro: "Esta API pertence à V1 e foi desativada.",
    },
    {
      status: 410,
    }
  );
}

export async function GET() {
  return rotaV1Desativada();
}

export async function POST() {
  return rotaV1Desativada();
}

export async function PUT() {
  return rotaV1Desativada();
}

export async function PATCH() {
  return rotaV1Desativada();
}

export async function DELETE() {
  return rotaV1Desativada();
}