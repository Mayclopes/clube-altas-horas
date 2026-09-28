import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    sistema: "Online",
    versao: "2.0.0",
  });
}