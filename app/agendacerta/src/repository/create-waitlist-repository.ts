import { hasDatabaseConfig } from "@/lib/database/env";
import { InMemoryWaitlistRepository } from "./in-memory-waitlist-repository";
import { PrismaWaitlistRepository } from "./prisma-waitlist-repository";
import type { WaitlistRepository } from "./waitlist-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, cai no seed em memória.
 */
export function createWaitlistRepository(): WaitlistRepository {
  if (hasDatabaseConfig()) {
    return new PrismaWaitlistRepository();
  }
  return new InMemoryWaitlistRepository();
}

export { WaitlistNotFoundError } from "./errors";
