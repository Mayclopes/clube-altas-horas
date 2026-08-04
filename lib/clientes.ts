import fs from "fs";
import path from "path";
import { Cliente } from "@/types/cliente";

const arquivo = path.join(
  process.cwd(),
  "data",
  "clientes.json"
);

export function listarClientes(): Cliente[] {
  const conteudo = fs.readFileSync(
    arquivo,
    "utf8"
  );

  return JSON.parse(conteudo);
}

export function buscarCliente(
  codigo: string
): Cliente | null {

  return (
    listarClientes().find(
      (cliente) => cliente.codigo === codigo
    ) ?? null
  );

}

export function salvarClientes(
  clientes: Cliente[]
) {

  fs.writeFileSync(
    arquivo,
    JSON.stringify(clientes, null, 2)
  );

}