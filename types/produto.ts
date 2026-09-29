export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  pontos: number;
  ativo: boolean;
  preco_centavos?: string | null;
};
