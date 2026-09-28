"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    setCarregando(true);

    try {
      const resposta = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({
            usuario,
            senha,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(
          dados.erro ||
            "Login inválido."
        );
        return;
      }

      const redirect =
        searchParams.get("redirect");

      if (
        redirect &&
        redirect.startsWith("/admin")
      ) {
        window.location.replace(
          redirect
        );
        return;
      }

      window.location.replace(
        "/admin"
      );
    } catch {
      setErro(
        "Não foi possível realizar o login."
      );
    } finally {
      setCarregando(false);
    }
  }

  function pressionarEnter(
    evento: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (evento.key === "Enter") {
      entrar();
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-600">
              Painel
              <br />
              Administrativo
            </h1>

            <p className="mt-3 text-zinc-400">
              Acesso restrito
            </p>
          </div>

          <div className="space-y-5">

            <div>
              <label
                htmlFor="usuario"
                className="block text-sm text-zinc-400 mb-2"
              >
                Usuário
              </label>

              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(evento) =>
                  setUsuario(
                    evento.target.value
                  )
                }
                onKeyDown={
                  pressionarEnter
                }
                disabled={carregando}
                autoComplete="username"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white outline-none focus:border-red-600 disabled:opacity-50"
                placeholder="Usuário"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-sm text-zinc-400 mb-2"
              >
                Senha
              </label>

              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(evento) =>
                  setSenha(
                    evento.target.value
                  )
                }
                onKeyDown={
                  pressionarEnter
                }
                disabled={carregando}
                autoComplete="current-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white outline-none focus:border-red-600 disabled:opacity-50"
                placeholder="Senha"
              />
            </div>

            {erro && (
              <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-4 text-sm">
                {erro}
              </div>
            )}

            <button
              type="button"
              onClick={entrar}
              disabled={
                carregando ||
                !usuario ||
                !senha
              }
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-400 text-white font-bold py-4 rounded-xl transition"
            >
              {carregando
                ? "Entrando..."
                : "Entrar"}
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}