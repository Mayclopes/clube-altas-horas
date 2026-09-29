# Financeiro V2 — preparado, não ativado no Neon

## Estado

A proposta 0001 foi aplicada e testada SOMENTE em PostgreSQL isolado: WASM em memória
(PGlite) e nativo portátil com múltiplas conexões, com fixtures inventadas. Nenhuma migration financeira foi aplicada ao
Neon real. A presença da função registrar_venda_v2 controla a disponibilidade:
antes dela, catálogo e atendimento antigo continuam funcionando, e estatísticas
mostram financeiro não ativado. Não criar essa função isoladamente: ela faz parte
da migration transacional completa. Não há execução automática de migrations.

## Schema aprovado e contrato

Dinheiro: BIGINT em centavos, BRL. API usa strings decimais, cálculos usam BigInt
ou PostgreSQL, nunca float como fonte persistida. Médias arredondam para o centavo
mais próximo; zero compradores/vendas exibe ausência de base, não ticket fictício.
NUMERIC seria exato no banco, mas requer biblioteca decimal no cliente; centavos
inteiros atendem a operação com quantidades inteiras e desconto global.

- produtos_v2.preco_centavos: nullable; NULL significa sem preço, não gratuito.
  Zero é um preço válido. Teto técnico: 1 bilhão de centavos por unidade.
- vendas_v2: cliente, operação, subtotal, desconto global, total gerado, pontos,
  status CONFIRMADA/CANCELADA, datas timestamptz e registrado_por opcional.
- itens_venda_v2: produto e nome congelado, quantidade, preço/pontos unitários
  congelados, subtotal/pontos gerados. Limite: 30 produtos distintos por venda,
  1–100 unidades por produto. Venda inteira incrementa compras apenas uma vez.
- operacoes_v2: chave única por tipo, hash canônico, estado e resposta/status.
- movimentacoes_v2: referências opcionais à venda, operação e movimento original.
  Uma COMPRA por venda, produto_id/quantidade nulos para representar venda múltipla.
  Movimentos antigos continuam aceitos e sem valores financeiros inventados.
- Triggers diferidos validam soma de subtotais/pontos dos itens e quantidade de
  itens contra o cabeçalho. FKs e checks validam valores, referências e status.

Desconto monetário global não reduz os pontos calculados por produto/quantidade,
conservando a regra de fidelidade por produto. Preço e pontos atuais são lidos no
servidor; valores enviados pelo navegador são ignorados. Itens já registrados não
consultam novamente o catálogo para alterar seus valores históricos.

## Operação atômica e idempotência

POST /api/vendas-v2 recebe codigo, itens[{produtoId,quantidade}],
descontoCentavos (string) e chave. Autorização reaproveita a sessão administrativa
existente no próprio handler; não há novo mecanismo de login ou mudança de NFC.

Normalização ordena itens e normaliza desconto/código antes de SHA-256. Uma única
chamada SQL à função PL/pgSQL SECURITY INVOKER executa reserva da chave, validações,
locks, cálculo, venda, itens, crédito, movimento e resposta. Falha em qualquer
etapa ou trigger reverte tudo, incluindo a reserva. Nunca persiste PROCESSANDO
separadamente. UNIQUE(tipo,chave) e FOR UPDATE serializam pedidos repetidos;
mesmo hash retorna exatamente a resposta original/201; payload diferente: 409.
Os locks de produtos seguem ordem de id, antes do cliente, compatível com a compra
antiga; resgate e compra financeira serializam no cliente. Não há retry automático
com nova chave. Infraestrutura que imponha isolamento SERIALIZABLE pode abortar
conflitos e deve repetir a mesma chave. Não há retenção/expiração automática de
operações nesta fase: apagar chaves antigas permitiria repetição.

Carrinho bloqueia envio sincronamente com ref e desativa controles. Persiste
somente pedido/código/chave em sessionStorage da aba, sem nome, telefone ou foto.
Falha desconhecida mantém pedido e chave; confirmar novamente confere o resultado.
Falhas definitivas de validação liberam edição. Chave conflitante/resultado
incerto não gera nova intenção silenciosamente. Se fechar a aba e perder a chave,
o operador deve conferir o histórico antes de registrar novamente.

## Compatibilidade e ativação futura

/api/compras-v2 continua disponível como fluxo interno de pontuação sem preço;
seu consumidor PainelPontuacao é fallback enquanto o financeiro não está ativado.
Nenhum histórico é reprocessado. Após ativação, a área operacional usa CarrinhoVenda;
produtos sem preço ficam indisponíveis para nova venda. O endpoint antigo continua
aceitando integrações existentes e suas operações não entram no faturamento.

Aplicação detecta schema por to_regprocedure. Leituras de preço via to_jsonb não
falham sem coluna. PUT de preço é recusado antes da ativação. A ativação completa
exige revisar a migration, testar no ambiente de destino, aplicar explicitamente
e configurar preços. Não preencher preços automaticamente. O deploy de código
pode anteceder a migration, graças ao fallback.

## Relatórios

Somente vendas CONFIRMADAS entram no financeiro. Faturamento é líquido do desconto;
ticket = total/número de vendas; gasto médio = total/clientes distintos. Mês:
America/Sao_Paulo, início inclusivo e próximo mês exclusivo. Unidades vêm dos itens.
Top produtos por quantidade e por subtotal BRUTO histórico (antes do desconto),
com nome atual de catálogo. Não ratear desconto sem regra comercial aprovada.
Relatórios relacionados usam uma transação somente leitura REPEATABLE READ.

Frequência financeira: média dos intervalos consecutivos por cliente entre vendas
confirmadas; uma venda é um evento independentemente dos itens. Métrica de
fidelidade anterior continua separada, baseada em movimentos COMPRA; não inventar
uma correspondência entre operações antigas e visitas/vendas.

Texto de cobertura: Dados financeiros contabilizados a partir da ativação do
registro de vendas. Sem vendas: totais zero e médias sem base. Sem schema: estado
não ativado. Nenhum preço histórico é inferido.

## Testes e limites

npm run test:financeiro usa somente PGlite em memória; não carrega .env nem driver
Neon. Recria baseline estrutural, aplica a proposta integral e testa contratos reais
com transporte SQL isolado. Cobre preços e snapshots, descontos, validações,
idempotência/reenvio, FKs, consistência de totais, rollback intermediário, relatórios
vazios/preenchidos e cálculo monetário exato.

PGlite serializa a execução de uma instância: Promise.all testa reenvio sobreposto
na aplicação, mas não substitui um ensaio de locks entre conexões PostgreSQL
independentes. Esse ensaio foi complementado pelo script test-concorrencia.cjs em PostgreSQL nativo isolado.
Cancelamento/estorno não possui endpoint/interface nesta etapa. Campos estão
preparados, mas a futura regra deve definir compensação de pontos já resgatados,
registro sem apagar original e eventual cancelamento parcial. Sem sistema de
funcionários: registrado_por continua nulo até identidade confiável estar disponível.

Antes da aplicação real: revisão final, plano de implantação/backup, configuração
de preços e ensaio concorrente no ambiente isolado. Nenhuma mudança destrutiva,
push faz parte desta etapa. Checkpoint local é permitido após todos os gates.

## Garantias da pré-ativação

Triggers diferidos conferem venda, itens, movimentação e resposta idempotente completa.
Snapshots financeiros e operações concluídas são imutáveis, inclusive contra remoção.
Movimento financeiro confere saldo e contador atual sob lock no momento de inserção;
saldos históricos não são comparados ao saldo atual após novos resgates/compras.
A função recusa saldo/compras negativos preexistentes e overflow; não corrige legado.
Chaves não expiram. Cancelamento/estorno futuro exige migration compensatória própria;
atualmente alterações diretas de vendas são recusadas.

Limites: 32 KiB por payload, 30 produtos, 100 unidades por produto, R$ 10.000.000,00
por unidade. O subtotal máximo possível é 3.000.000.000.000 centavos (R$ 30 bilhões),
abaixo do teto de representação de 9.007.199.254.740.991 centavos. Desconto entre
zero e subtotal. NULL bloqueia venda; zero permite produto gratuito com seus pontos.
Carrinho mantém chave após timeout de 20 segundos, falha de rede e refresh na mesma aba.

A suíte npm run test:financeiro inclui DOM, regressão e relatórios isolados.
npm run test:concorrencia usa PostgreSQL nativo portátil, loopback e fixtures,
com bloqueios observados em conexões independentes. Não depende de Neon ou .env.
No Windows pode precisar de execução fora do sandbox para encerrar o processo próprio.
Dados de teste ficam em node_modules/.cache/financeiro, ignorados pelo Git.
Dependências de teste não são usadas pelo runtime de produção.
Plano autorizado somente para etapa futura: ACTIVATION_PLAN.md.
