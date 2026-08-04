async function carregar() {
  const res = await fetch("http://localhost:3000/api/status", {
    cache: "no-store",
  });

  return res.json();
}

export default async function HealthPage() {
  const status = await carregar();

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold text-red-600">
        Status do Sistema
      </h1>

      <div className="mt-10 bg-zinc-900 rounded-xl p-8 space-y-5">

        <p>
          <strong>Sistema:</strong> {status.sistema}
        </p>

        <p>
          <strong>Banco:</strong> {status.banco}
        </p>

        <p>
          <strong>Clientes:</strong> {status.clientes}
        </p>

        <p>
          <strong>Versão:</strong> {status.versao}
        </p>

      </div>

    </main>
  );
}