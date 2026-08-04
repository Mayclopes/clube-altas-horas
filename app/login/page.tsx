"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {

  const router = useRouter();

  const [usuario, setUsuario] = useState("");

  const [senha, setSenha] = useState("");

  function entrar() {

    if (

      usuario === "altashorascontinental" &&

      senha === "caralho123"

    ) {

      localStorage.setItem(

        "admin-logado",

        "true"

      );

      router.push("/admin");

      return;

    }

    alert("Login inválido.");

  }

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8">

        <h1 className="text-4xl font-bold text-red-600 text-center">

          Painel Administrativo

        </h1>

        <input

          className="w-full mt-8 p-4 rounded-xl bg-zinc-800"

          placeholder="Usuário"

          value={usuario}

          onChange={(e) => setUsuario(e.target.value)}

        />

        <input

          type="password"

          className="w-full mt-4 p-4 rounded-xl bg-zinc-800"

          placeholder="Senha"

          value={senha}

          onChange={(e) => setSenha(e.target.value)}

        />

        <button

          onClick={entrar}

          className="w-full mt-6 bg-red-600 rounded-xl py-4 font-bold"

        >

          Entrar

        </button>

      </div>

    </main>

  );

}