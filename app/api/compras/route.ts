import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { erro: "Esta API pertence à V1 e foi desativada." },
    { status: 410 }
  );
}
