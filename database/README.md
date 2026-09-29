# Banco e migrations

A inspeção de 2026-09-29 usou catálogos PostgreSQL e transações READ ONLY.
`baseline-schema.json` contém todas as colunas, tipos, nullability, defaults,
constraints, índices e triggers das quatro tabelas públicas V2. Não contém registros.
É um baseline documental, não um script de criação nem uma migration aplicada.

## Datas

`movimentacoes_v2.criado_em`, `clientes_v2.criado_em` e `clientes_v2.atualizado_em`
são timestamptz NOT NULL DEFAULT now(). Sessão inspecionada: GMT. As gravações do
código usam now() ou o default: representam instantes absolutos; apresentação em
America/Sao_Paulo. Catálogos e agregações não comprovam a origem de eventuais
importações históricas, mas nenhum timestamp nulo foi encontrado.

## Integridade observada

Todas as tabelas têm PK text(id). Clientes têm UNIQUE(codigo). Movimentações têm
FK(cliente_codigo) -> clientes(codigo), ON UPDATE CASCADE, ON DELETE RESTRICT.
CHECK de tipo permite COMPRA/RESGATE/AJUSTE/BONUS; quantidade é nula ou positiva.
Não há FK de produto_id, check de saldo não negativo, identidade de saldos, nem
identificador de venda/recompensa/operação idempotente. Não há triggers de usuário.
Índices cobrem código, atividade e pontos de clientes; cliente/data, data e tipo
em movimentações. O índice simples de código duplica a cobertura do UNIQUE;
não foi removido. Demais detalhes estão no JSON estrutural.

## Fluxo versionado

- `migrations/`: somente migrations revisadas e aprovadas; numeração crescente.
- `proposals/0001_financeiro.sql`: proposta NÃO executada no Neon real e fora da pasta
  de aplicação. Não há runner automático no projeto.
- Antes de aplicar: revisar desenho, confirmar ambiente, backup/recovery,
  testar numa branch Neon isolada, verificar locks e validar todos os dados.
- Promover o arquivo aprovado para migrations, registrar versão/checksum/data
  no controle de implantação e aplicar uma única vez, explicitamente.
- Nunca rodar SQL em lote por glob incluindo proposals. Não usar bootstrap
  para recriar tabelas existentes. Não há rollback destrutivo automático.
- A proposta falha se objetos já existirem: investigar drift em vez de ignorá-lo.

Comandos de inspeção/validação usam a conexão existente sem imprimir valores:
`node scripts/inspect-schema.cjs`, `node scripts/validate-reports.cjs` e
`node scripts/test-report-queries.cjs`. Todos usam READ ONLY. O primeiro atualiza
apenas o snapshot local. O último usa CTEs fictícias e EXPLAIN sem ANALYZE.

Teste financeiro isolado: npm run test:financeiro. Executa a proposta em PGlite
em memória, sem carregar ambiente nem usar o Neon. A presença da função da
migration ativa o carrinho; aplicar no Neon continua dependendo de revisão final.
