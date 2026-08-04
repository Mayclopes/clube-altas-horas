import compras from "@/data/compras.json";
import type { Compra } from "@/types/compra";

export function listarCompras() {

  return compras as Compra[];

}