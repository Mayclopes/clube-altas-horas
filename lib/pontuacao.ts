import { Cliente } from "@/types/cliente";

export function adicionarCompra(cliente: Cliente): Cliente {
  return {
    ...cliente,

    compras: cliente.compras + 1,

    pontos: cliente.pontos + 1,
  };
}

export function removerCompra(cliente: Cliente): Cliente {
  return {
    ...cliente,

    compras: Math.max(cliente.compras - 1, 0),

    pontos: Math.max(cliente.pontos - 1, 0),
  };
}