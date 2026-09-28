import { NextResponse } from "next/server";

function rotaDesativada() {
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
  return rotaDesativada();
}

export async function POST() {
  return rotaDesativada();
}

export async function PUT() {
  return rotaDesativada();
}

export async function DELETE() {
  return rotaDesativada();
}