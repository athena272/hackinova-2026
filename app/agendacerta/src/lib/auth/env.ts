import {
  DatabaseConfigError,
  readDatabaseUrl,
  type EnvSource,
} from "@/lib/database/env";

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export type AuthEnv = {
  databaseUrl: string;
  secret: string;
  baseUrl?: string;
};

export const MIN_AUTH_SECRET_LENGTH = 32;

function readRequired(
  env: EnvSource,
  name: string,
  hint: string,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new AuthConfigError(
      `Autenticação não configurada: defina ${name}. ${hint}`,
    );
  }
  return value;
}

function assertUrl(name: string, value: string, protocols: string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AuthConfigError(`${name} não é uma URL válida.`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new AuthConfigError(
      `${name} deve começar com ${protocols.map((p) => `${p}//`).join(" ou ")}.`,
    );
  }
}

function readAuthDatabaseUrl(env: EnvSource): string {
  try {
    return readDatabaseUrl(env);
  } catch (error) {
    if (error instanceof DatabaseConfigError) {
      throw new AuthConfigError(error.message);
    }
    throw error;
  }
}

/**
 * Lê e valida as variáveis do Better Auth.
 * BETTER_AUTH_URL é opcional: sem ela, o Better Auth infere a URL da requisição.
 */
export function getAuthEnv(env: EnvSource = process.env): AuthEnv {
  const databaseUrl = readAuthDatabaseUrl(env);

  const secret = readRequired(
    env,
    "BETTER_AUTH_SECRET",
    "Gere com: openssl rand -base64 32",
  );
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new AuthConfigError(
      `BETTER_AUTH_SECRET precisa ter pelo menos ${MIN_AUTH_SECRET_LENGTH} caracteres.`,
    );
  }

  const baseUrl = env.BETTER_AUTH_URL?.trim() || undefined;
  if (baseUrl) {
    assertUrl("BETTER_AUTH_URL", baseUrl, ["http:", "https:"]);
  }

  return { databaseUrl, secret, baseUrl };
}
