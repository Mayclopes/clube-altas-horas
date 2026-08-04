import recompensas from "@/data/recompensas.json";
import type { Recompensa } from "@/types/recompensa";

export function buscarRecompensa(
  pontos: number
): Recompensa | null {

  const recompensa = (recompensas as Recompensa[]).find(
    (r) => r.pontos === pontos
  );

  return recompensa ?? null;
}