export function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR");
}