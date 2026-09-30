-- Migration 0002: limpeza administrativa atômica para um único cliente,
-- preservando seu cadastro. Depende da migration financeira 0001.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.proteger_registro_financeiro_v2() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  -- A função limpar_dados_cliente_v2 habilita esta permissão somente na sua
  -- transação. Não há endpoint que aceite este marcador do navegador.
  IF current_setting('clube_altas_horas.limpeza_cliente', true) = 'autorizada' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
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

CREATE FUNCTION public.limpar_dados_cliente_v2(p_codigo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_cliente public.clientes_v2%ROWTYPE;
  v_vendas text[] := ARRAY[]::text[];
  v_operacoes text[] := ARRAY[]::text[];
  v_itens integer := 0; v_movimentos integer := 0; v_vendas_removidas integer := 0;
  v_operacoes_removidas integer := 0; v_linhas integer;
BEGIN
  IF p_codigo IS NULL OR p_codigo !~ '^AH[0-9]{6}$' THEN
    RAISE EXCEPTION 'Codigo invalido' USING ERRCODE = 'P2010';
  END IF;
  SELECT * INTO v_cliente FROM public.clientes_v2 WHERE codigo = p_codigo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente' USING ERRCODE = 'P2001'; END IF;

  -- Uma origem de movimento de outro cliente não pode ser apagada silenciosamente.
  IF EXISTS (
    SELECT 1 FROM public.movimentacoes_v2 origem JOIN public.movimentacoes_v2 referencia
      ON referencia.movimentacao_origem_id = origem.id
    WHERE origem.cliente_codigo = p_codigo AND referencia.cliente_codigo <> p_codigo
  ) THEN RAISE EXCEPTION 'Referencia externa encontrada' USING ERRCODE = 'P2011'; END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::text[]), COALESCE(array_agg(operacao_id), ARRAY[]::text[])
    INTO v_vendas, v_operacoes FROM public.vendas_v2 WHERE cliente_codigo = p_codigo;
  PERFORM set_config('clube_altas_horas.limpeza_cliente', 'autorizada', true);

  -- Remove primeiro folhas da FK autorreferente, repetindo até não restar histórico.
  LOOP
    WITH folhas AS (
      SELECT m.id FROM public.movimentacoes_v2 m
      WHERE m.cliente_codigo = p_codigo AND NOT EXISTS (
        SELECT 1 FROM public.movimentacoes_v2 filha
        WHERE filha.movimentacao_origem_id = m.id AND filha.cliente_codigo = p_codigo
      )
    ), removidas AS (
      DELETE FROM public.movimentacoes_v2 m USING folhas f WHERE m.id = f.id RETURNING m.id
    ) SELECT count(*) INTO v_linhas FROM removidas;
    v_movimentos := v_movimentos + v_linhas;
    EXIT WHEN v_linhas = 0;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.movimentacoes_v2 WHERE cliente_codigo = p_codigo) THEN
    RAISE EXCEPTION 'Historico nao removivel' USING ERRCODE = 'P2011';
  END IF;

  DELETE FROM public.itens_venda_v2 WHERE venda_id = ANY(v_vendas); GET DIAGNOSTICS v_itens = ROW_COUNT;
  DELETE FROM public.vendas_v2 WHERE id = ANY(v_vendas); GET DIAGNOSTICS v_vendas_removidas = ROW_COUNT;
  DELETE FROM public.operacoes_v2 WHERE id = ANY(v_operacoes); GET DIAGNOSTICS v_operacoes_removidas = ROW_COUNT;
  UPDATE public.clientes_v2 SET pontos = 0, compras = 0, atualizado_em = clock_timestamp() WHERE codigo = p_codigo;
  RETURN jsonb_build_object('sucesso',true,'movimentacoes',v_movimentos,'itens',v_itens,
    'vendas',v_vendas_removidas,'operacoes',v_operacoes_removidas);
END $$;
COMMIT;
