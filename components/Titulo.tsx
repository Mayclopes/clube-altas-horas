type Props = {
  titulo: string;
  subtitulo?: string;
};

export default function Titulo({
  titulo,
  subtitulo,
}: Props) {
  return (
    <div className="mb-8">

      <h1 className="text-5xl font-bold text-red-600">
        {titulo}
      </h1>

      {subtitulo && (
        <p className="text-gray-400 mt-3">
          {subtitulo}
        </p>
      )}

    </div>
  );
}