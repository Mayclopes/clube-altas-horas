export interface HistoricoCompra {
  data: string;
  pontos: number;
}

export interface Cliente {
  codigo: string;
  nome: string;
  whatsapp: string;
  nascimento: string;
  pontos: number;
  compras: number;
  historico: HistoricoCompra[];
}