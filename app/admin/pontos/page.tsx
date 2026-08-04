import clientes from "@/data/clientes.json";
import recompensas from "@/data/recompensas.json";

export default function Pontos() {
  return (
    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-5xl font-bold text-red-600">
        Resgate de Recompensas
      </h1>

      <div className="space-y-6 mt-10">

        {clientes.map((cliente) => {

          const disponiveis = recompensas.filter(
            (recompensa) => cliente.pontos >= recompensa.pontos
          );

          return (
            <div
              key={cliente.codigo}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-6"
            >

              <h2 className="text-2xl font-bold">
                {cliente.nome}
              </h2>

              <p className="mt-2">
                ⭐ {cliente.pontos} pontos
              </p>

              <div className="mt-5">

                {disponiveis.length === 0 ? (

                  <p className="text-gray-400">
                    Nenhuma recompensa disponível.
                  </p>

                ) : (

                  disponiveis.map((recompensa) => (

                    <div
                      key={recompensa.id}
                      className="mt-2 border border-zinc-700 rounded-lg p-3"
                    >
                      🎁 {recompensa.nome}
                    </div>

                  ))

                )}

              </div>

            </div>
          );

        })}

      </div>

    </main>
  );
}