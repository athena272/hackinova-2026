/**
 * Cria o usuário da clínica no Better Auth (cadastro público fica desligado no app).
 * Uso: pnpm auth:create-user  (lê DATABASE_URL, BETTER_AUTH_SECRET e CLINIC_USER_* do .env.local)
 */
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { readClinicUserInput } from "../src/lib/auth/clinic-user-input";
import { getAuthEnv } from "../src/lib/auth/env";
import { AUTH_TABLES, buildAuthOptions } from "../src/lib/auth/server";

async function main(): Promise<void> {
  const input = readClinicUserInput(process.env);
  const env = getAuthEnv();
  const pool = new Pool({ connectionString: env.databaseUrl });

  try {
    const existing = await pool.query(
      `select 1 from public.${AUTH_TABLES.user} where email = $1 limit 1`,
      [input.email],
    );
    if (existing.rowCount) {
      console.log(`Usuário ${input.email} já existe. Nada a fazer.`);
      return;
    }

    const auth = betterAuth(buildAuthOptions({ allowSignUp: true, env, pool }));
    await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });
    console.log(`Usuário ${input.email} criado. Já pode entrar em /login.`);
  } finally {
    await pool.end();
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error && "code" in error && error.code === "ECONNREFUSED") {
    return `${error.message}. O Postgres está rodando? Local: npx supabase start (na raiz do repo).`;
  }
  return error instanceof Error ? error.message : String(error);
}

main().catch((error: unknown) => {
  console.error("Falha ao criar usuário da clínica:", describeError(error));
  process.exit(1);
});
