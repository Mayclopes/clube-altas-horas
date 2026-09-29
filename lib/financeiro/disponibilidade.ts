import { sql } from "@/lib/db";

// Ausência da migration mantém o atendimento legado e relatórios de fidelidade.
export async function financeiroDisponivel(): Promise<boolean> {
  const [estado] = await sql`
    SELECT to_regprocedure('public.registrar_venda_v2(text,jsonb,bigint,text,text)') IS NOT NULL AS disponivel
  `;
  return estado.disponivel === true;
}
