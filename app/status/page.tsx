export default async function Status() {

  const dados = await fetch(
    "http://localhost:3000/api/health",
    {
      cache: "no-store"
    }
  ).then(res => res.json());

  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="bg-zinc-900 p-8 rounded-xl w-full max-w-lg">

        <h1 className="text-4xl font-bold text-red-600 mb-8">
          Status do Sistema
        </h1>

        <p>
          <strong>API:</strong> {dados.api}
        </p>

        <p className="mt-4">
          <strong>Status:</strong> {dados.status}
        </p>

        <p className="mt-4">
          <strong>Versão:</strong> {dados.versao}
        </p>

      </div>

    </main>

  );

}