// Consultas exclusivamente financeiras: jamais atribuem preço a movimentações antigas.
export const RESUMO_FINANCEIRO = `
WITH periodo AS (
  SELECT date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AS inicio
), vendas AS (
  SELECT v.*, (v.criado_em >= (p.inicio AT TIME ZONE 'America/Sao_Paulo')
    AND v.criado_em < ((p.inicio + interval '1 month') AT TIME ZONE 'America/Sao_Paulo')) AS no_mes
  FROM vendas_v2 v CROSS JOIN periodo p WHERE v.status = 'CONFIRMADA'
), resumo AS (
  SELECT COALESCE(SUM(total_centavos),0)::text AS faturamento,
    COALESCE(SUM(total_centavos) FILTER (WHERE no_mes),0)::text AS faturamento_mes,
    COUNT(*)::text AS vendas, COUNT(*) FILTER (WHERE no_mes)::text AS vendas_mes,
    COUNT(DISTINCT cliente_codigo)::text AS clientes,
    COALESCE(SUM(pontos_gerados),0)::text AS pontos,
    MIN(criado_em) AS primeira_venda
  FROM vendas
), unidades AS (
  SELECT COALESCE(SUM(i.quantidade),0)::text AS unidades
  FROM itens_venda_v2 i JOIN vendas v ON v.id = i.venda_id
), sequencia AS (
  SELECT criado_em, LAG(criado_em) OVER (PARTITION BY cliente_codigo ORDER BY criado_em,id) AS anterior
  FROM vendas
), frequencia AS (
  SELECT AVG(EXTRACT(EPOCH FROM (criado_em-anterior))) AS intervalo_segundos,
    COUNT(*)::text AS intervalos FROM sequencia WHERE anterior IS NOT NULL
)
SELECT * FROM resumo CROSS JOIN unidades CROSS JOIN frequencia
`;
const PRODUTOS_BASE = `
SELECT p.id, p.nome, SUM(i.quantidade)::text AS unidades,
  SUM(i.subtotal_centavos)::text AS bruto
FROM itens_venda_v2 i JOIN vendas_v2 v ON v.id = i.venda_id
JOIN produtos_v2 p ON p.id = i.produto_id
WHERE v.status = 'CONFIRMADA'
GROUP BY p.id,p.nome
`;
export const TOP_QUANTIDADE = PRODUTOS_BASE + ` ORDER BY SUM(i.quantidade) DESC, p.id ASC LIMIT 10`;
export const TOP_FATURAMENTO = PRODUTOS_BASE + ` ORDER BY SUM(i.subtotal_centavos) DESC, p.id ASC LIMIT 10`;
