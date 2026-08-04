import { NextResponse } from "next/server";

export async function GET() {

  return NextResponse.json({

    status: "ok",

    api: "online",

    versao: "1.0",

    data: new Date().toISOString()

  });

}