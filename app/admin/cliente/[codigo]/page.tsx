import { sql } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

import PainelPontuacao from "./PainelPontuacao";
import EditarCliente from "./EditarCliente";
import FotoCliente from "./FotoCliente";
import CarrinhoVenda from "./CarrinhoVenda";
import { financeiroDisponivel } from "@/lib/financeiro/disponibilidade";

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

type ClienteV2 = {
  codigo: string;
  nome: string;
  whatsapp: string;
  nascimento: string | null;
  pontos: number;
  compras: number;
  ativo: boolean;
  observacao_inatividade: string | null;
  foto_url: string | null;
};

type ProdutoV2 = {
  id: string;
  nome: string;
  descricao: string;
  pontos: number;
  ativo: boolean;
  preco_centavos: string | null;
};

export const dynamic = "force-dynamic";

function formatarNascimento(
  nascimento: string | null
) {
  if (
    !nascimento ||
    !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)
  ) {
    return "Não informado";
  }

  const [ano, mes, dia] = nascimento.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default async function ClienteAdmin({
  params,
}: Props) {
  const { codigo } = await params;

  const codigoNormalizado =
    codigo.trim().toUpperCase();

  const resultadoClientes = await sql`
    SELECT
      codigo,
      nome,
      whatsapp,
      TO_CHAR(
        nascimento,
        'YYYY-MM-DD'
      ) AS nascimento,
      pontos,
      compras,
      ativo,
      observacao_inatividade,
      foto_url
    FROM clientes_v2
    WHERE codigo = ${codigoNormalizado}
    LIMIT 1
  `;

  if (resultadoClientes.length === 0) {
    notFound();
  }

  const cliente =
    resultadoClientes[0] as ClienteV2;

  const resultadoProdutos = await sql`
    SELECT
      id,
      nome,
      descricao,
      pontos,
      ativo,
      to_jsonb(p)->>'preco_centavos' AS preco_centavos
    FROM produtos_v2 p
    WHERE ativo = TRUE
    ORDER BY id
  `;

  const produtos =
    resultadoProdutos as ProdutoV2[];
  const financeiro = await financeiroDisponivel();

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <p className="font-bold text-red-500">
          Atendimento Clube
        </p>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-900">
            {cliente.foto_url ? (
              <img
                src={cliente.foto_url}
                alt="Foto do cliente"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-bold">
              {cliente.nome}
            </h1>

            <p className="mt-2 text-zinc-500">
              🔑 {cliente.codigo}
            </p>

            <span
              className={
                cliente.ativo
                  ? "mt-3 inline-block rounded-full border border-green-900 bg-green-950 px-3 py-1 text-sm text-green-400"
                  : "mt-3 inline-block rounded-full border border-red-900 bg-red-950 px-3 py-1 text-sm text-red-400"
              }
            >
              {cliente.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
            <p className="text-zinc-400">Pontos</p>
            <p className="mt-2 text-4xl font-bold text-red-500">
              {cliente.pontos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
            <p className="text-zinc-400">Compras</p>
            <p className="mt-2 text-4xl font-bold">
              {cliente.compras}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <FotoCliente
            key={cliente.foto_url ?? "sem-foto"}
            codigo={cliente.codigo}
            fotoInicial={cliente.foto_url}
          />
        </div>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-bold">
            Dados do cliente
          </h2>

          <p className="mt-4 text-zinc-500">
            WhatsApp
          </p>
          <p>{cliente.whatsapp}</p>

          <p className="mt-4 text-zinc-500">
            Nascimento
          </p>
          <p>
            {formatarNascimento(cliente.nascimento)}
          </p>
        </section>

        {!cliente.ativo &&
          cliente.observacao_inatividade && (
            <section className="mt-5 rounded-2xl border border-red-900 bg-red-950 p-5">
              <h2 className="font-bold text-red-400">
                Motivo da inativação
              </h2>

              <p className="mt-3 whitespace-pre-wrap break-words text-zinc-200">
                {cliente.observacao_inatividade}
              </p>
            </section>
          )}

        <div className="mt-5">
          <EditarCliente
            key={JSON.stringify([
              cliente.nome,
              cliente.whatsapp,
              cliente.nascimento,
              cliente.ativo,
              cliente.observacao_inatividade,
            ])}
            codigo={cliente.codigo}
            nomeInicial={cliente.nome}
            whatsappInicial={cliente.whatsapp}
            nascimentoInicial={cliente.nascimento}
            ativoInicial={cliente.ativo}
            observacaoInicial={
              cliente.observacao_inatividade
            }
          />
        </div>

        {cliente.ativo ? (
          financeiro ? <CarrinhoVenda key={cliente.codigo} codigo={cliente.codigo} produtos={produtos} /> :
          <PainelPontuacao
            codigo={cliente.codigo}
            nomeCliente={cliente.nome}
            pontosAtuais={cliente.pontos}
            produtos={produtos}
          />
        ) : (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950 p-5">
            <p className="font-bold text-red-400">
              Cliente inativo
            </p>

            <p className="mt-2 text-zinc-400">
              Reative o cadastro para registrar
              novas compras.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-3">
          <Link
            href={`/cliente/${cliente.codigo}/historico`}
            className="rounded-xl border border-zinc-700 bg-zinc-900 py-4 text-center font-bold"
          >
            📜 Ver histórico
          </Link>

          <Link
            href={`/cliente/${cliente.codigo}`}
            className="rounded-xl border border-zinc-700 bg-zinc-900 py-4 text-center"
          >
            👤 Abrir cartão do cliente
          </Link>

          <Link
            href="/admin/clientes"
            className="rounded-xl bg-zinc-800 py-4 text-center"
          >
            👥 Voltar aos clientes
          </Link>

          <Link
            href="/admin"
            className="rounded-xl bg-zinc-800 py-4 text-center"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </main>
  );
}
