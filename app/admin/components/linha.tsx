type Props = {
  titulo: string;
  valor: string | number;
};

export default function Linha({
  titulo,
  valor,
}: Props) {
  return (
    <div className="flex justify-between py-3 border-b border-zinc-800">

      <span className="text-gray-400">
        {titulo}
      </span>

      <span className="font-bold">
        {valor}
      </span>

    </div>
  );
}