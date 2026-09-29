-- PROPOSTA 0001: NÃO EXECUTADA NO NEON REAL. Revisar database/financeiro.md antes de aprovar.
-- Aplicação única, transacional, sem IF NOT EXISTS para não esconder divergências.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.produtos_v2
  ADD COLUMN preco_centavos bigint,
  ADD CONSTRAINT produtos_v2_preco_valido
    CHECK (preco_centavos IS NULL OR preco_centavos BETWEEN 0 AND 1000000000);

CREATE TABLE public.operacoes_v2 (
  id text PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('COMPRA', 'RESGATE')),
  chave text NOT NULL CHECK (length(chave) BETWEEN 16 AND 128),
  requisicao_hash text NOT NULL CHECK (requisicao_hash ~ '^[0-9a-f]{64}$'),
  estado text NOT NULL CHECK (estado IN ('PROCESSANDO', 'CONCLUIDA')),
  resposta jsonb,
  http_status integer CHECK (http_status BETWEEN 200 AND 599),
  criado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  UNIQUE (tipo, chave),
  CHECK (
    (estado = 'PROCESSANDO' AND resposta IS NULL AND http_status IS NULL AND concluido_em IS NULL)
    OR (estado = 'CONCLUIDA' AND resposta IS NOT NULL AND http_status IS NOT NULL AND concluido_em IS NOT NULL)
  )
);

CREATE TABLE public.vendas_v2 (
  id text PRIMARY KEY,
  cliente_codigo text NOT NULL REFERENCES public.clientes_v2(codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  operacao_id text NOT NULL UNIQUE REFERENCES public.operacoes_v2(id) ON DELETE RESTRICT,
  moeda text NOT NULL DEFAULT 'BRL' CHECK (moeda = 'BRL'),
  subtotal_centavos bigint NOT NULL CHECK (subtotal_centavos BETWEEN 0 AND 9007199254740991),
  desconto_centavos bigint NOT NULL DEFAULT 0 CHECK (desconto_centavos BETWEEN 0 AND subtotal_centavos),
  total_centavos bigint GENERATED ALWAYS AS (subtotal_centavos - desconto_centavos) STORED,
  pontos_gerados integer NOT NULL CHECK (pontos_gerados >= 0),
  compras_apos integer NOT NULL CHECK (compras_apos > 0),
  status text NOT NULL DEFAULT 'CONFIRMADA' CHECK (status IN ('CONFIRMADA', 'CANCELADA')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  cancelado_em timestamptz,
  motivo_cancelamento varchar(300),
  registrado_por text,
  CHECK ((status = 'CONFIRMADA' AND cancelado_em IS NULL AND motivo_cancelamento IS NULL)
    OR (status = 'CANCELADA' AND cancelado_em IS NOT NULL AND length(trim(motivo_cancelamento)) > 0 AND motivo_cancelamento IS NOT NULL))
);

CREATE TABLE public.itens_venda_v2 (
  id text PRIMARY KEY,
  venda_id text NOT NULL REFERENCES public.vendas_v2(id) ON DELETE RESTRICT,
  produto_id text NOT NULL REFERENCES public.produtos_v2(id) ON DELETE RESTRICT,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade BETWEEN 1 AND 100),
  preco_unitario_centavos bigint NOT NULL CHECK (preco_unitario_centavos BETWEEN 0 AND 1000000000),
  subtotal_centavos bigint GENERATED ALWAYS AS (quantidade::bigint * preco_unitario_centavos) STORED,
  pontos_unitarios integer NOT NULL CHECK (pontos_unitarios >= 0),
  pontos_gerados bigint GENERATED ALWAYS AS (quantidade::bigint * pontos_unitarios) STORED,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Campos opcionais preservam todas as movimentações anteriores sem backfill.
ALTER TABLE public.movimentacoes_v2
  ADD COLUMN venda_id text REFERENCES public.vendas_v2(id) ON DELETE RESTRICT,
  ADD COLUMN operacao_id text UNIQUE REFERENCES public.operacoes_v2(id) ON DELETE RESTRICT,
  ADD COLUMN movimentacao_origem_id text REFERENCES public.movimentacoes_v2(id) ON DELETE RESTRICT;

CREATE INDEX vendas_v2_cliente_data ON public.vendas_v2(cliente_codigo, criado_em DESC);
CREATE INDEX vendas_v2_data ON public.vendas_v2(criado_em DESC);
CREATE INDEX itens_venda_v2_venda ON public.itens_venda_v2(venda_id);
CREATE INDEX itens_venda_v2_produto ON public.itens_venda_v2(produto_id);
CREATE INDEX movimentacoes_v2_venda ON public.movimentacoes_v2(venda_id);
CREATE INDEX movimentacoes_v2_origem ON public.movimentacoes_v2(movimentacao_origem_id);
CREATE UNIQUE INDEX movimentacoes_v2_compra_por_venda
  ON public.movimentacoes_v2(venda_id) WHERE tipo = 'COMPRA' AND venda_id IS NOT NULL;
CREATE UNIQUE INDEX itens_venda_v2_produto_unico ON public.itens_venda_v2(venda_id, produto_id);
ALTER TABLE public.movimentacoes_v2 ADD CONSTRAINT movimentacao_financeira_valida CHECK (
  (venda_id IS NULL AND operacao_id IS NULL) OR
  (venda_id IS NOT NULL AND operacao_id IS NOT NULL AND tipo = 'COMPRA'
    AND pontos >= 0 AND saldo_anterior >= 0
    AND saldo_novo::bigint = saldo_anterior::bigint + pontos::bigint)
);

-- Snapshots e respostas concluídas não podem ser reescritos ou removidos.
-- O saldo atual muda em compras/resgates futuros; não é o saldo histórico da venda.
CREATE FUNCTION public.proteger_registro_financeiro_v2() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_TABLE_NAME = 'movimentacoes_v2' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.venda_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clientes_v2 c WHERE c.codigo = NEW.cliente_codigo
          AND c.pontos = NEW.saldo_novo AND c.compras =
            (SELECT compras_apos FROM public.vendas_v2 WHERE id = NEW.venda_id) FOR UPDATE
      ) THEN RAISE EXCEPTION 'Saldo financeiro inconsistente' USING ERRCODE = '23514'; END IF;
      RETURN NEW;
    END IF;
    IF OLD.venda_id IS NULL AND OLD.operacao_id IS NULL THEN
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      IF NEW.venda_id IS NULL AND NEW.operacao_id IS NULL THEN RETURN NEW; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'operacoes_v2' THEN
    IF OLD.estado = 'PROCESSANDO' AND TG_OP = 'UPDATE' THEN
      IF (to_jsonb(OLD) - ARRAY['estado','resposta','http_status','concluido_em']) =
         (to_jsonb(NEW) - ARRAY['estado','resposta','http_status','concluido_em']) THEN RETURN NEW; END IF;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Registro financeiro imutavel' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER proteger_venda BEFORE UPDATE OR DELETE ON public.vendas_v2
  FOR EACH ROW EXECUTE FUNCTION public.proteger_registro_financeiro_v2();
CREATE TRIGGER proteger_item BEFORE UPDATE OR DELETE ON public.itens_venda_v2
  FOR EACH ROW EXECUTE FUNCTION public.proteger_registro_financeiro_v2();
CREATE TRIGGER proteger_operacao BEFORE UPDATE OR DELETE ON public.operacoes_v2
  FOR EACH ROW EXECUTE FUNCTION public.proteger_registro_financeiro_v2();
CREATE TRIGGER proteger_movimentacao BEFORE INSERT OR UPDATE OR DELETE ON public.movimentacoes_v2
  FOR EACH ROW EXECUTE FUNCTION public.proteger_registro_financeiro_v2();
-- Validação diferida de totais: permite a montagem atômica da venda e dos itens.
CREATE FUNCTION public.conferir_totais_venda_v2() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_id text; v public.vendas_v2%ROWTYPE; s numeric; p numeric; n bigint;
  m public.movimentacoes_v2%ROWTYPE; op public.operacoes_v2%ROWTYPE; snapshots jsonb;
BEGIN
  IF TG_TABLE_NAME = 'vendas_v2' THEN v_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'operacoes_v2' THEN
    SELECT id INTO v_id FROM public.vendas_v2 WHERE operacao_id = NEW.id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Operacao sem venda' USING ERRCODE = '23514'; END IF;
  ELSE v_id := NEW.venda_id;
  END IF;
  IF v_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v FROM public.vendas_v2 WHERE id = v_id;
  SELECT COALESCE(SUM(subtotal_centavos),0), COALESCE(SUM(pontos_gerados),0), COUNT(*)
    INTO s,p,n FROM public.itens_venda_v2 WHERE venda_id = v_id;
  IF n < 1 OR n > 30 OR s <> v.subtotal_centavos OR p <> v.pontos_gerados THEN
    RAISE EXCEPTION 'Totais da venda inconsistentes' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO m FROM public.movimentacoes_v2 WHERE venda_id = v_id AND tipo = 'COMPRA';
  IF NOT FOUND OR m.cliente_codigo IS DISTINCT FROM v.cliente_codigo
    OR m.pontos IS DISTINCT FROM v.pontos_gerados OR m.operacao_id IS DISTINCT FROM v.operacao_id THEN
    RAISE EXCEPTION 'Movimentacao da venda inconsistente' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO op FROM public.operacoes_v2 WHERE id = v.operacao_id;
  SELECT jsonb_agg(jsonb_build_object('produto_id',produto_id,'nome',produto_nome,
    'quantidade',quantidade,'preco_unitario_centavos',preco_unitario_centavos::text,
    'subtotal_centavos',subtotal_centavos::text,'pontos_unitarios',pontos_unitarios,
    'pontos_gerados',pontos_gerados) ORDER BY produto_id) INTO snapshots
    FROM public.itens_venda_v2 WHERE venda_id = v_id;
  IF op.tipo <> 'COMPRA' OR op.estado <> 'CONCLUIDA' OR op.http_status <> 201
    OR op.resposta->'sucesso' IS DISTINCT FROM 'true'::jsonb
    OR op.resposta->'venda' IS DISTINCT FROM jsonb_build_object(
      'id',v.id,'codigo',v.cliente_codigo,'subtotal_centavos',v.subtotal_centavos::text,
      'desconto_centavos',v.desconto_centavos::text,'total_centavos',v.total_centavos::text,
      'pontos',v.pontos_gerados,'saldoAnterior',m.saldo_anterior,'saldoNovo',m.saldo_novo,
      'compras',v.compras_apos,'itens',snapshots,'criado_em',v.criado_em)
    OR jsonb_typeof(op.resposta->'venda'->'compras') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'Resposta idempotente inconsistente' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER conferir_venda_totais
  AFTER INSERT OR UPDATE ON public.vendas_v2 DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.conferir_totais_venda_v2();
CREATE CONSTRAINT TRIGGER conferir_itens_totais
  AFTER INSERT OR UPDATE ON public.itens_venda_v2 DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.conferir_totais_venda_v2();
CREATE CONSTRAINT TRIGGER conferir_movimentacao_financeira
  AFTER INSERT OR UPDATE ON public.movimentacoes_v2 DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.conferir_totais_venda_v2();
CREATE CONSTRAINT TRIGGER conferir_operacao_financeira
  AFTER INSERT OR UPDATE ON public.operacoes_v2 DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.conferir_totais_venda_v2();

-- SECURITY INVOKER: usa apenas permissões da conexão administrativa do servidor.
-- Uma chamada equivale a uma transação. Exceções revertem inclusive a reserva da chave.
CREATE FUNCTION public.registrar_venda_v2(
  p_codigo text, p_itens jsonb, p_desconto bigint, p_chave text, p_hash text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
<<venda>>
DECLARE
  op public.operacoes_v2%ROWTYPE;
  cliente public.clientes_v2%ROWTYPE;
  produto public.produtos_v2%ROWTYPE;
  item record; quantidade integer;
  snapshots jsonb := '[]'::jsonb;
  subtotal bigint := 0; pontos bigint := 0; saldo_novo integer; compras_novas integer;
  venda_id text := gen_random_uuid()::text;
  operacao_id text := gen_random_uuid()::text;
  instante timestamptz;
  resposta jsonb;
BEGIN
  IF p_codigo IS NULL OR p_codigo !~ '^AH[0-9]{6}$'
     OR p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array'
     OR p_desconto IS NULL OR p_desconto < 0
     OR p_chave IS NULL OR p_chave !~ '^[a-zA-Z0-9_-]{16,128}$'
     OR p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Pedido invalido' USING ERRCODE = 'P2006';
  END IF;
  IF jsonb_array_length(p_itens) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Itens invalidos' USING ERRCODE = 'P2006';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_itens) e
    WHERE jsonb_typeof(e) <> 'object' OR NOT (e ? 'produtoId') OR NOT (e ? 'quantidade')
      OR jsonb_typeof(e->'produtoId') <> 'string' OR length(e->>'produtoId') NOT BETWEEN 1 AND 100
      OR jsonb_typeof(e->'quantidade') <> 'number' OR (e->>'quantidade') !~ '^[0-9]{1,3}$') THEN
    RAISE EXCEPTION 'Item invalido' USING ERRCODE = 'P2006';
  END IF;
  IF (SELECT COUNT(DISTINCT e->>'produtoId') FROM jsonb_array_elements(p_itens) e) <> jsonb_array_length(p_itens) THEN
    RAISE EXCEPTION 'Produto repetido' USING ERRCODE = 'P2006';
  END IF;

  INSERT INTO public.operacoes_v2(id,tipo,chave,requisicao_hash,estado)
    VALUES (operacao_id,'COMPRA',p_chave,p_hash,'PROCESSANDO')
    ON CONFLICT (tipo,chave) DO NOTHING;
  SELECT * INTO op FROM public.operacoes_v2 WHERE tipo = 'COMPRA' AND chave = p_chave FOR UPDATE;
  IF op.requisicao_hash <> p_hash THEN RAISE EXCEPTION 'Chave conflitante' USING ERRCODE = 'P2007'; END IF;
  IF op.estado = 'CONCLUIDA' THEN RETURN op.resposta; END IF;
  IF op.id <> operacao_id THEN RAISE EXCEPTION 'Operacao pendente' USING ERRCODE = 'P2009'; END IF;

  -- Ordem estável dos locks de produto; compra antiga também bloqueia produto antes do cliente.
  FOR item IN SELECT e->>'produtoId' AS id, (e->>'quantidade')::integer AS qtd
    FROM jsonb_array_elements(p_itens) e ORDER BY e->>'produtoId'
  LOOP
    quantidade := item.qtd;
    IF quantidade NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Quantidade invalida' USING ERRCODE = 'P2006'; END IF;
    SELECT * INTO produto FROM public.produtos_v2 WHERE id = item.id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto inexistente' USING ERRCODE = 'P2003'; END IF;
    IF NOT produto.ativo OR produto.pontos < 0 THEN RAISE EXCEPTION 'Produto indisponivel' USING ERRCODE = 'P2003'; END IF;
    IF produto.preco_centavos IS NULL THEN RAISE EXCEPTION 'Produto sem preco' USING ERRCODE = 'P2004'; END IF;
    subtotal := subtotal + produto.preco_centavos * quantidade;
    pontos := pontos + produto.pontos::bigint * quantidade;
    snapshots := snapshots || jsonb_build_array(jsonb_build_object(
      'produto_id',produto.id,'nome',produto.nome,'quantidade',quantidade,
      'preco_unitario_centavos',produto.preco_centavos::text,
      'subtotal_centavos',(produto.preco_centavos * quantidade)::text,
      'pontos_unitarios',produto.pontos,'pontos_gerados',produto.pontos::bigint * quantidade));
  END LOOP;
  IF p_desconto > subtotal THEN RAISE EXCEPTION 'Desconto excessivo' USING ERRCODE = 'P2005'; END IF;
  SELECT * INTO cliente FROM public.clientes_v2 WHERE codigo = p_codigo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente' USING ERRCODE = 'P2001'; END IF;
  IF NOT cliente.ativo THEN RAISE EXCEPTION 'Cliente inativo' USING ERRCODE = 'P2002'; END IF;
  IF pontos > 2147483647 OR cliente.pontos < 0 OR cliente.compras < 0
    OR cliente.pontos::bigint + pontos > 2147483647 OR cliente.compras = 2147483647 THEN
    RAISE EXCEPTION 'Limite de pontos ou compras' USING ERRCODE = 'P2008';
  END IF;
  instante := clock_timestamp();
  INSERT INTO public.vendas_v2(id,cliente_codigo,operacao_id,subtotal_centavos,desconto_centavos,pontos_gerados,compras_apos,criado_em)
    VALUES(venda_id,p_codigo,operacao_id,subtotal,p_desconto,pontos::integer,cliente.compras+1,instante);
  INSERT INTO public.itens_venda_v2(id,venda_id,produto_id,produto_nome,quantidade,preco_unitario_centavos,pontos_unitarios,criado_em)
    SELECT gen_random_uuid()::text,venda_id,e->>'produto_id',e->>'nome',(e->>'quantidade')::integer,
      (e->>'preco_unitario_centavos')::bigint,(e->>'pontos_unitarios')::integer,instante
    FROM jsonb_array_elements(snapshots) e;
  UPDATE public.clientes_v2 SET pontos = clientes_v2.pontos + venda.pontos::integer,
    compras = compras + 1, atualizado_em = instante WHERE codigo = p_codigo
    RETURNING clientes_v2.pontos, compras INTO saldo_novo, compras_novas;
  INSERT INTO public.movimentacoes_v2(id,cliente_codigo,tipo,descricao,pontos,saldo_anterior,saldo_novo,
    produto_id,quantidade,criado_em,venda_id,operacao_id)
    VALUES(gen_random_uuid()::text,p_codigo,'COMPRA','Venda: ' || jsonb_array_length(p_itens)::text || ' produto(s)',
      pontos::integer,cliente.pontos,saldo_novo,NULL,NULL,instante,venda_id,operacao_id);
  resposta := jsonb_build_object('sucesso',true,'mensagem','Venda registrada com sucesso.',
    'venda',jsonb_build_object('id',venda_id,'codigo',p_codigo,'subtotal_centavos',subtotal::text,
      'desconto_centavos',p_desconto::text,'total_centavos',(subtotal-p_desconto)::text,
      'pontos',pontos,'saldoAnterior',cliente.pontos,'saldoNovo',saldo_novo,'compras',compras_novas,
      'itens',snapshots,'criado_em',instante));
  UPDATE public.operacoes_v2 SET estado = 'CONCLUIDA', resposta = venda.resposta,
    http_status = 201, concluido_em = instante WHERE id = operacao_id;
  RETURN resposta;
END $$;
COMMIT;
