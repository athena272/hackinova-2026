export type SignInErrorLike = {
  status?: number;
  code?: string;
};

export const SIGN_IN_MESSAGES = {
  invalidCredentials: "E-mail ou senha inválidos.",
  tooManyAttempts: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  unavailable:
    "Login indisponível no momento. Verifique a configuração do servidor.",
  network: "Não foi possível conectar ao servidor. Tente novamente.",
  generic: "Não foi possível entrar. Tente novamente.",
} as const;

/** Traduz o erro do Better Auth para uma mensagem amigável em PT-BR. */
export function describeSignInError(error: SignInErrorLike): string {
  if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
    return SIGN_IN_MESSAGES.invalidCredentials;
  }
  if (error.status === 429) {
    return SIGN_IN_MESSAGES.tooManyAttempts;
  }
  if (error.status !== undefined && error.status >= 500) {
    return SIGN_IN_MESSAGES.unavailable;
  }
  if (error.status === 0) {
    return SIGN_IN_MESSAGES.network;
  }
  return SIGN_IN_MESSAGES.generic;
}
