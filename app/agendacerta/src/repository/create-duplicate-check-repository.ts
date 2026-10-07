import { hasDatabaseConfig } from "@/lib/database/env";
import type { DuplicateCheckRepository } from "./duplicate-check-repository";
import { InMemoryDuplicateCheckRepository } from "./in-memory-duplicate-check-repository";
import { PrismaDuplicateCheckRepository } from "./prisma-duplicate-check-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, guarda as confirmações em memória, junto da agenda em memória.
 */
export function createDuplicateCheckRepository(): DuplicateCheckRepository {
  if (hasDatabaseConfig()) {
    return new PrismaDuplicateCheckRepository();
  }
  return new InMemoryDuplicateCheckRepository();
}
