const premios = [
  {
    pontos: 10,
    premio: "Refrigerante 2L"
  },
  {
    pontos: 20,
    premio: "Dose Especial"
  },
  {
    pontos: 30,
    premio: "Combo VIP"
  },
  {
    pontos: 50,
    premio: "Jack Daniels"
  }
];

export default function Recompensas() {

  return (

    <main className="min-h-screen bg-black text-white p-8">

      <h1 className="text-5xl font-bold text-red-600">
        Recompensas
      </h1>

      <div className="space-y-5 mt-10">

        {premios.map((item) => (

          <div
            key={item.pontos}
            className="bg-zinc-900 rounded-xl p-6"
          >

            <h2 className="text-3xl font-bold">

              ⭐ {item.pontos} pontos

            </h2>

            <p className="mt-3">

              {item.premio}

            </p>

          </div>

        ))}

      </div>

    </main>

  );

}