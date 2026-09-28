import { sql } from "@/lib/db";
import PainelAdmin from "./PainelAdmin";

type ClienteV2 = {
  codigo: string;
  nome: string;
  pontos: number;
  compras: number;
};

export const dynamic = "force-dynamic";

export default async function Admin() {
  const resultado = await sql`
    SELECT
      codigo,
      nome,
      pontos,
      compras
    FROM clientes_v2
    WHERE ativo = TRUE
    ORDER BY criado_em DESC
    LIMIT 5
  `;

  const ultimosClientes =
    resultado as ClienteV2[];

  return (
    <PainelAdmin
      ultimosClientes={
        ultimosClientes
      }
    />
  );
}