import { createHmac } from "crypto";
import { timingSafeEqual } from "crypto";

const DURACAO_SESSAO_MS =
  8 * 60 * 60 * 1000;

export const COOKIE_ADMIN =
  "admin-session";

export const DURACAO_SESSAO_SEGUNDOS =
  8 * 60 * 60;

function obterSecret() {
  const secret =
    process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET não configurado."
    );
  }

  return secret;
}

function gerarAssinatura(
  valor: string
) {
  return createHmac(
    "sha256",
    obterSecret()
  )
    .update(valor)
    .digest("hex");
}

export function criarSessaoAdmin() {
  const expiracao =
    Date.now() + DURACAO_SESSAO_MS;

  const expiracaoTexto =
    String(expiracao);

  const assinatura =
    gerarAssinatura(expiracaoTexto);

  return `${expiracaoTexto}.${assinatura}`;
}

export function sessaoAdminValida(
  sessao: string | undefined
) {
  try {
    if (!sessao) {
      return false;
    }

    const partes =
      sessao.split(".");

    if (partes.length !== 2) {
      return false;
    }

    const expiracaoTexto =
      partes[0];

    const assinatura =
      partes[1];

    const expiracao =
      Number(expiracaoTexto);

    if (
      !Number.isFinite(expiracao)
    ) {
      return false;
    }

    if (
      expiracao <= Date.now()
    ) {
      return false;
    }

    const assinaturaEsperada =
      gerarAssinatura(
        expiracaoTexto
      );

    return (
      assinatura ===
      assinaturaEsperada
    );
  } catch {
    return false;
  }
}

export function credenciaisAdminValidas(
  usuario: string,
  senha: string
) {
  const usuarioCorreto =
    process.env.ADMIN_USER;

  const senhaCorreta =
    process.env.ADMIN_PASSWORD;

  if (
    !usuarioCorreto ||
    !senhaCorreta
  ) {
    throw new Error(
      "ADMIN_USER ou ADMIN_PASSWORD não configurado."
    );
  }

  return usuario === usuarioCorreto && senhaAdminValida(senha);
}

// Reautenticação de operações administrativas sensíveis. A senha só é comparada
// no servidor e nunca é enviada de volta ao navegador ou registrada em logs.
export function senhaAdminValida(senha: unknown) {
  const senhaCorreta = process.env.ADMIN_PASSWORD;
  if (!senhaCorreta || typeof senha !== "string") return false;
  const recebida = Buffer.from(senha);
  const esperada = Buffer.from(senhaCorreta);
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
}
