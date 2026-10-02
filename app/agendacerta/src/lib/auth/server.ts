import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/database/prisma";
import { getAuthEnv, type AuthEnv } from "./env";

/** Precisam bater com supabase/migrations/*_create_auth_tables.sql e prisma/schema.prisma. */
export const AUTH_TABLES = {
  user: "auth_user",
  session: "auth_session",
  account: "auth_account",
  verification: "auth_verification",
} as const;

type BuildAuthOptionsParams = {
  /** Só o script de criação de usuário deve habilitar cadastro. */
  allowSignUp: boolean;
  env?: AuthEnv;
  prisma?: PrismaClient;
};

export function buildAuthOptions({
  allowSignUp,
  env = getAuthEnv(),
  prisma = getPrisma(),
}: BuildAuthOptionsParams) {
  return {
    appName: "AgendaCerta",
    baseURL: env.baseUrl,
    secret: env.secret,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    user: { modelName: AUTH_TABLES.user },
    session: { modelName: AUTH_TABLES.session },
    account: { modelName: AUTH_TABLES.account },
    verification: { modelName: AUTH_TABLES.verification },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
    },
  } satisfies BetterAuthOptions;
}

function createAuth() {
  return betterAuth(buildAuthOptions({ allowSignUp: false }));
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & {
  __agendacertaAuth?: Auth;
};

/**
 * Instância única do Better Auth, criada sob demanda para o `next build`
 * não exigir as variáveis de ambiente. Lança AuthConfigError se faltar config.
 */
export function getAuth(): Auth {
  globalForAuth.__agendacertaAuth ??= createAuth();
  return globalForAuth.__agendacertaAuth;
}
