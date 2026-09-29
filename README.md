# Clube Altas Horas V2

Programa de fidelidade com cadastro por código/NFC, pontos por produto, resgates
e atendimento administrativo. Stack: Next.js 16 (App Router), React 19,
TypeScript, Tailwind CSS, Neon/PostgreSQL e Vercel Blob para fotos.

## Estrutura

- app/admin: atendimento, catálogo, pontos, ranking e estatísticas protegidos.
- app/api/*-v2: operações V2; lib/db: cliente SQL Neon.
- app/c/[codigo]: entrada NFC; app/cliente/[codigo]: cartão e histórico públicos.
- lib/auth e proxy.ts: sessão e proteção administrativa existentes.
- database: baseline real, processo de migrations e proposta financeira.
- scripts: inspeção e testes SQL somente leitura, sem saída de dados pessoais.

Saldo disponível é o valor utilizável em resgates em clientes_v2.pontos.
Pontos conquistados do ranking somam somente pontos positivos de COMPRA.
RESGATE reduz saldo, mas não conquista; BONUS/AJUSTE não entram no ranking.
Ranking mensal usa o mês de America/Sao_Paulo com início inclusivo/fim exclusivo.
Estatísticas consultam todo o histórico; frequência é a média dos intervalos
consecutivos por cliente, ponderada por intervalos, não por clientes. Atualmente
COMPRA é um registro de operação, sem deduplicação confiável de visitas/vendas.

## Desenvolvimento e validação

Use a configuração local já provisionada; não copie credenciais para documentação.
Instale dependências com npm ci; execute npm run dev. Valide com:

```sh
npx tsc --noEmit
npm run build
git diff --check
node scripts/validate-reports.cjs
node scripts/test-report-queries.cjs
```

O build usa Google Fonts e pode precisar de rede. Scripts SQL carregam ambiente
internamente e usam READ ONLY; não imprimem conexão nem registros de clientes.
Nunca versionar .env (já ignorado), imprimir valores, incluir tokens em logs ou
colocar segredos em variáveis NEXT_PUBLIC. Não fazer testes de mutação em produção.
As rotas públicas de cartão/histórico continuam baseadas no código existente;
as telas administrativas novas não criam APIs públicas nem exportam contatos.

## Banco e evolução

Leia database/README.md e database/financeiro.md. Baseline é documental.
A proposta financeira está fora de migrations aprovadas e NÃO foi executada no Neon real.
Não há runner automático. Preços, carrinho, idempotência e relatórios estão preparados, com fallback até a migration financeira ser aprovada e aplicada.
APIs V1 contidas retornam 410; arquivos antigos ainda presentes não são fonte V2.

Fluxo: PLANEJAR → ALTERAR → TESTAR → COMMIT. Commit/push somente quando autorizados.
Antes de alterar código Next.js, leia a documentação da versão instalada em
node_modules/next/dist/docs, conforme AGENTS.md. Preserve contratos de cadastro,
NFC, resgate e fotos; valide concorrência num banco isolado antes de implantação.

## Financeiro preparado

POST /api/vendas-v2 registra uma venda completa de forma atômica e idempotente.
Dinheiro usa centavos BIGINT/string; preços/pontos vêm do servidor. O carrinho
substitui a pontuação simples somente após a presença do schema financeiro.
Compras antigas não geram faturamento fictício. Consulte database/financeiro.md.

Execute npm run test:financeiro para testar a migration e os fluxos em PostgreSQL
local em memória (PGlite). Esse teste não lê .env e não conecta ao Neon.
