// Valores monetários trafegam como strings decimais de centavos.
export const MAX_PRECO = BigInt("1000000000");
export const MAX_TOTAL = BigInt("9007199254740991");

export function reaisParaCentavos(texto: string): string {
  const valor = texto.trim();
  if (!/^\d{1,10}([,.]\d{1,2})?$/.test(valor)) throw new Error("Informe reais sem separador de milhar e com até duas casas decimais.");
  const [inteiros, fracao = ""] = valor.replace(",", ".").split(".");
  return (BigInt(inteiros) * BigInt(100) + BigInt(fracao.padEnd(2, "0"))).toString();
}
export function centavosParaReais(valor: string): string {
  const centavos = BigInt(valor);
  return `${centavos / BigInt(100)},${(centavos % BigInt(100)).toString().padStart(2, "0")}`;
}
export function formatarDinheiro(valor: string | bigint): string {
  const centavos = BigInt(valor);
  const sinal = centavos < BigInt(0) ? "-" : "";
  const absoluto = centavos < BigInt(0) ? -centavos : centavos;
  return `${sinal}R$ ${(absoluto / BigInt(100)).toLocaleString("pt-BR")},${(absoluto % BigInt(100)).toString().padStart(2, "0")}`;
}
export function mediaCentavos(total: string, quantidade: string | number): string | null {
  const divisor = BigInt(quantidade);
  return divisor === BigInt(0) ? null : ((BigInt(total) + divisor / BigInt(2)) / divisor).toString();
}
