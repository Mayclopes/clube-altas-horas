import fs from "fs";
import path from "path";

export async function salvarCliente(cliente: any) {
  const arquivo = path.join(process.cwd(), "data", "clientes.json");

  const conteudo = fs.readFileSync(arquivo, "utf8");

  const clientes = JSON.parse(conteudo);

  clientes.push(cliente);

  fs.writeFileSync(
    arquivo,
    JSON.stringify(clientes, null, 2)
  );
}