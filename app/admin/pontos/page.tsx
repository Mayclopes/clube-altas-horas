import Link from "next/link";
import { sql } from "@/lib/db";
import ListaPontos from "./ListaPontos";

export const dynamic = "force-dynamic";

export default async function Pontos() {
  const resultado = await sql`
    SELECT c.codigo, c.nome, c.pontos, c.compras,
      COUNT(r.id) AS recompensas_disponiveis
    FROM clientes_v2 c
    LEFT JOIN recompensas_v2 r
      ON r.ativo = TRUE AND r.pontos > 0 AND r.pontos <= c.pontos
    WHERE c.ativo = TRUE
    GROUP BY c.codigo, c.nome, c.pontos, c.compras
    ORDER BY c.pontos DESC, c.nome ASC, c.codigo ASC
  `;
  const clientes = resultado.map((c) => ({
    codigo: String(c.codigo), nome: String(c.nome),
    pontos: Number(c.pontos), compras: Number(c.compras),
    recompensas: Number(c.recompensas_disponiveis),
  }));

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-zinc-400 hover:text-white">← Voltar ao painel</Link>
        <h1 className="mt-6 text-4xl font-bold text-red-500">Pontos</h1>
        <p className="mt-3 text-zinc-400">Clientes ativos, ordenados pelo saldo disponível. Recompensas ativas com custo positivo e dentro do saldo.</p>
        <ListaPontos clientes={clientes} />
      </div>
    </main>
  );
}
