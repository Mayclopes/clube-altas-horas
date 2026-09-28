import { sql } from "@/lib/db";

import {
  COOKIE_ADMIN,
  sessaoAdminValida,
} from "@/lib/auth";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

export default async function PaginaNFC({
  params,
}: Props) {
  const { codigo } = await params;

  const codigoNormalizado = codigo
    .trim()
    .toUpperCase();

  // Aceita somente o padrão dos
  // chaveiros do Clube Altas Horas.
  if (!/^AH\d{6}$/.test(codigoNormalizado)) {
    redirect("/");
  }

  // Verifica se o celular possui
  // uma sessão administrativa válida.
  const armazenamento = await cookies();

  const sessao = armazenamento.get(
    COOKIE_ADMIN
  )?.value;

  const administrador =
    sessaoAdminValida(sessao);

  // Busca o cliente no Neon.
  const clientes = await sql`
    SELECT codigo
    FROM clientes_v2
    WHERE codigo = ${codigoNormalizado}
    LIMIT 1
  `;

  // Administrador autenticado:
  // abre diretamente o atendimento.
  if (administrador) {
    if (clientes.length > 0) {
      redirect(
        `/admin/cliente/${codigoNormalizado}`
      );
    }

    redirect(
      `/cadastro?codigo=${codigoNormalizado}`
    );
  }

  // Cliente comum:
  // abre seu perfil sem login.
  if (clientes.length > 0) {
    redirect(
      `/cliente/${codigoNormalizado}`
    );
  }

  // Chaveiro ainda não cadastrado.
  redirect(
    `/cadastro?codigo=${codigoNormalizado}`
  );
}