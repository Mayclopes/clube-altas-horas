type Props = {
  titulo: string;
  valor: string | number;
};

export default function CardCliente({ titulo, valor }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-gray-500">{titulo}</p>

      <h2 className="text-3xl font-bold text-red-500 mt-2">
        {valor}
      </h2>
    </div>
  );
}