import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseUrl } from "./env";

function createPrisma(): PrismaClient {
  const adapter = new PrismaPg(
    { connectionString: readDatabaseUrl() },
    {
      onPoolError: (error) => {
        console.error("[database] erro em conexão ociosa do Postgres", error);
      },
    },
  );
  return new PrismaClient({ adapter, errorFormat: "minimal" });
}

const globalForPrisma = globalThis as typeof globalThis & {
  __agendacertaPrisma?: PrismaClient;
};

/**
 * Cliente único compartilhado por repositórios e Better Auth, criado sob
 * demanda para o `next build` não exigir DATABASE_URL.
 * Lança DatabaseConfigError se a variável faltar ou for inválida.
 */
export function getPrisma(): PrismaClient {
  globalForPrisma.__agendacertaPrisma ??= createPrisma();
  return globalForPrisma.__agendacertaPrisma;
}
