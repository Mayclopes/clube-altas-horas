"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { codigo: string; nome: string };

export default function ZerarDadosCliente({ codigo, nome }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [segundaConfirmacao, setSegundaConfirmacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const frase = `ZERAR ${codigo}`;

  async function zerar() {
    if (enviando || !segundaConfirmacao || confirmacao !== frase || !senha) return;
    setEnviando(true); setErro("");
    try {
      const resposta = await fetch(`/api/clientes-v2/${encodeURIComponent(codigo)}/zerar-dados`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ senha, confirmacao }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível zerar os dados.");
      setSenha(""); setConfirmacao(""); setAberto(false); setSegundaConfirmacao(false);
      router.refresh();
    } catch (causa) { setErro(causa instanceof Error ? causa.message : "Não foi possível zerar os dados."); }
    finally { setEnviando(false); }
  }

  return (
    <section className="mt-10 rounded-2xl border border-red-950 bg-red-950/30 p-5">
      <h2 className="font-bold text-red-300">Zona de segurança</h2>
      <p className="mt-2 text-sm text-zinc-300">Use somente para apagar dados operacionais de teste deste cliente.</p>
      {!aberto ? <button type="button" onClick={() => { setAberto(true); setErro(""); }} className="mt-4 rounded-xl border border-red-800 px-4 py-3 text-sm font-bold text-red-300">Zerar dados do cliente</button> : <div className="mt-5 space-y-4">
        <p className="rounded-xl border border-red-900 bg-black/30 p-4 text-sm">Você vai zerar os dados de <strong>{nome}</strong> ({codigo}). O cadastro, chaveiro NFC, código, foto e estado do cliente serão preservados. Pontos, compras, histórico, resgates, vendas, itens e chaves de idempotência serão apagados.</p>
        <label className="block text-sm">Senha administrativa<input type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} disabled={enviando} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3" /></label>
        <label className="block text-sm">Digite <strong>{frase}</strong><input type="text" autoComplete="off" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} disabled={enviando} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3" /></label>
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={segundaConfirmacao} onChange={e => setSegundaConfirmacao(e.target.checked)} disabled={enviando} />Confirmo que esta operação apaga permanentemente os dados operacionais listados acima.</label>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setAberto(false); setSenha(""); setConfirmacao(""); setSegundaConfirmacao(false); }} disabled={enviando} className="rounded-xl bg-zinc-800 px-4 py-3">Cancelar</button><button type="button" onClick={zerar} disabled={enviando || !senha || confirmacao !== frase || !segundaConfirmacao} className="rounded-xl bg-red-700 px-4 py-3 font-bold disabled:bg-zinc-700">{enviando ? "Zerando..." : "Confirmar e zerar dados"}</button></div>
      </div>}
      {erro && <p role="alert" className="mt-4 rounded-xl bg-red-950 p-3 text-sm text-red-200">{erro}</p>}
    </section>
  );
}
