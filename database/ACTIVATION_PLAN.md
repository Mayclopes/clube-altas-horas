# Ativação controlada do financeiro V2 — NÃO EXECUTADO

Este roteiro exige autorização explícita na próxima etapa. Não há migration automática.

1. Confirmar branch `v2`, árvore limpa e checkpoint `V2 checkpoint antes da ativação financeira`.
2. Registrar hash do checkpoint e SHA-256 de `database/proposals/0001_financeiro.sql`.
   Conferir que não há `.env` rastreado nem credenciais no deploy/logs.
3. Confirmar projeto, branch e versão PostgreSQL do Neon pelo painel seguro. Comparar
   catálogos com `baseline-schema.json`; a coluna de preço e os objetos financeiros
   devem estar ausentes. Se houver implantação parcial ou drift, parar e investigar.
4. Verificar agregados de saldos/compras negativos e limites de integer. Não corrigir
   histórico automaticamente. Confirmar permissões de DDL e PL/pgSQL do aplicador.
5. Obter snapshot/branch de recuperação ou backup apropriado, confirmar retenção e
   procedimento de restauração. Sem recuperação verificável, não ativar.
6. Ensaiar o arquivo exato numa branch isolada com a mesma versão/configuração do
   destino. Validar aplicação e constraints. Combinar janela curta sem atendimento.
7. Publicar o código do checkpoint com o fallback ainda ativo. Conferir login, NFC,
   catálogo, perfil e histórico. Não criar a função financeira separadamente.
8. Aplicar **uma única vez** o arquivo completo `database/proposals/0001_financeiro.sql`
   por cliente PostgreSQL seguro, com parada no primeiro erro (`ON_ERROR_STOP` no psql).
   O próprio arquivo contém BEGIN/COMMIT, lock_timeout=5s e statement_timeout=60s.
   Não executar arquivos por glob; registrar checksum/data/resultado no controle de implantação.
9. Confirmar preço nullable BIGINT; três tabelas novas; FKs, CHECKs, índices únicos;
   triggers de integridade/imutabilidade; funções. Confirmar transação concluída e
   registros legados preservados com vínculos financeiros nulos. Reaplicar deve falhar.
10. Conferir detecção `to_regprocedure('public.registrar_venda_v2(text,jsonb,bigint,text,text)')`
    e cabeçalho `X-Financeiro-Disponivel` em `/api/produtos-v2`. Atendimento deve exibir carrinho.
11. Configurar inicialmente preço de **um único produto ativo** no admin. NULL significa
    indisponível; zero significa gratuito e pode gerar pontos. Conferir persistência em centavos.
12. Usar cliente de teste explicitamente autorizado. Registrar saldo/compras iniciais e
    executar uma venda pequena, com chave idempotente preservada. Não usar cliente alheio.
13. Conferir uma venda CONFIRMADA, quantidade correta de itens/snapshots e operação CONCLUIDA.
    Subtotal = soma dos itens; total = subtotal − desconto; pontos = soma dos itens.
14. Conferir exatamente uma COMPRA vinculada à mesma venda/operação/cliente; pontos iguais;
    saldo_novo − saldo_anterior = pontos. Saldo e compras do cliente devem refletir um incremento.
15. Conferir perfil e histórico públicos, atendimento, Pontos, ranking geral/mensal e Top 3.
16. Conferir faturamento líquido, ticket, unidades e pontos. Ranking por produto é BRUTO;
    histórico anterior não recebe preço fictício. Comparar com os valores da venda controlada.
17. Reenviar a mesma intenção/chave: mesma resposta e nenhum incremento adicional. Com a
    mesma chave e payload diferente: 409. Conservar a chave histórica; não há expiração.
18. Testar um resgate autorizado: débito único, histórico correto, conquista do ranking
    preservada. Repetir a venda original continua retornando sua resposta histórica.
19. Se os smoke tests passarem, configurar gradualmente os demais preços e liberar atendimento.
    Monitorar falhas, latência e bloqueios. Compra-v2 permanece compatível, sem faturamento.
20. **Aborto/contingência:** erro de DDL/timeout: não continuar comandos; confirmar rollback
    integral antes de nova tentativa. Divergência, crédito duplicado ou smoke test falho após
    COMMIT: suspender vendas financeiras/atendimento por controle de implantação e investigar.
    Não apagar função para simular fallback, não excluir vendas/chaves e não desfazer schema
    automaticamente. Após vendas/resgates, restauração exige decisão explícita e reconciliação
    de todas as operações posteriores ao snapshot. Preferir correção aditiva. Cancelamento/
    estorno exige implementação própria de compensação; UPDATE direto é bloqueado.

## Evidências e limites

Suíte local: `npm run test:financeiro`; PostgreSQL nativo isolado: `npm run test:concorrencia`.
Os testes não carregam `.env` nem usam Neon. DOM e serviços de sessão/Blob são simulados;
o smoke test final no ambiente implantado continua obrigatório. Alterar diretamente o saldo
legado por SQL continua sendo uma operação administrativa privilegiada: a migration protege
os registros financeiros vinculados e a função transacional, sem reconstruir um razão global
retroativo. Nunca executar ajustes manuais sem registro e reconciliação.
