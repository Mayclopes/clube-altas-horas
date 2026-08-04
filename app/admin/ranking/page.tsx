import clientes from "@/data/clientes.json";

export default function Ranking() {

  const ranking = [...clientes]
    .sort((a, b) => b.pontos - a.pontos);

  return (

    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-5xl font-bold text-red-600">
        Ranking
      </h1>

      <div className="space-y-4 mt-10">

        {ranking.map((cliente, index) => (

          <div
            key={cliente.codigo}
            className="bg-zinc-900 rounded-xl p-5 flex justify-between"
          >

            <div>

              <h2 className="text-2xl font-bold">

                #{index + 1} {cliente.nome}

              </h2>

              <p>{cliente.codigo}</p>

            </div>

            <h2 className="text-3xl">

              ⭐ {cliente.pontos}

            </h2>

          </div>

        ))}

      </div>

    </main>

  );

}