import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const rotaAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  /*
   * APIs exclusivamente administrativas da V2.
   */
  const apiAdmin =
    pathname === "/api/produtos-v2" ||
    pathname.startsWith("/api/produtos-v2/") ||

    pathname === "/api/recompensas-v2" ||
    pathname.startsWith("/api/recompensas-v2/") ||

    pathname === "/api/compras-v2" ||
    pathname.startsWith("/api/compras-v2/") ||

    pathname === "/api/resgates-v2" ||
    pathname.startsWith("/api/resgates-v2/") ||

    pathname === "/api/clientes-v2/buscar" ||
    pathname.startsWith("/api/clientes-v2/buscar/") ||

    pathname === "/api/foto-cliente" ||
    pathname.startsWith("/api/foto-cliente/") ||

    (
      pathname === "/api/clientes-v2" &&
      request.method !== "POST"
    );

  if (!rotaAdmin && !apiAdmin) {
    return NextResponse.next();
  }

  const sessao =
    request.cookies.get(COOKIE_ADMIN)?.value;

  if (sessaoAdminValida(sessao)) {
    return NextResponse.next();
  }

  if (apiAdmin) {
    return NextResponse.json(
      {
        erro: "Não autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  const url = request.nextUrl.clone();

  url.pathname = "/login";

  url.searchParams.set(
    "redirect",
    pathname
  );

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",

    "/api/produtos-v2/:path*",
    "/api/recompensas-v2/:path*",
    "/api/compras-v2/:path*",
    "/api/resgates-v2/:path*",
    "/api/clientes-v2/:path*",
    "/api/foto-cliente/:path*",
  ],
};