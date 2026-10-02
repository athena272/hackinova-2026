/**
 * Cria o usuário da clínica no Better Auth (cadastro público fica desligado no app).
 * Uso: pnpm auth:create-user  (lê DATABASE_URL, BETTER_AUTH_SECRET e CLINIC_USER_* do .env.local)
 */
import { betterAuth } from "better-auth";
import { readClinicUserInput } from "../src/lib/auth/clinic-user-input";
import { getAuthEnv } from "../src/lib/auth/env";
import { buildAuthOptions } from "../src/lib/auth/server";
import { getPrisma } from "../src/lib/database/prisma";

const UNREACHABLE_CODES = new Set(["ECONNREFUSED", "P1001"]);

async function main(): Promise<void> {
  const input = readClinicUserInput(process.env);
  const env = getAuthEnv();
  const prisma = getPrisma();

  try {
    const existing = await prisma.auth_user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      console.log(`Usuário ${input.email} já existe. Nada a fazer.`);
      return;
    }

    const auth = betterAuth(buildAuthOptions({ allowSignUp: true, env, prisma }));
    await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });
    console.log(`Usuário ${input.email} criado. Já pode entrar em /login.`);
  } finally {
    await prisma.$disconnect();
  }
}

function describeError(error: unknown): string {
  const code =
    error instanceof Error && "code" in error ? String(error.code) : undefined;
  if (code && UNREACHABLE_CODES.has(code)) {
    return `${(error as Error).message}. O Postgres está rodando? Local: npx supabase start (na raiz do repo).`;
  }
  return error instanceof Error ? error.message : String(error);
}

main().catch((error: unknown) => {
  console.error("Falha ao criar usuário da clínica:", describeError(error));
  process.exit(1);
});
