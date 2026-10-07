import { hasDatabaseConfig } from "@/lib/database/env";
import { InMemoryOverbookingRepository } from "./in-memory-overbooking-repository";
import type { OverbookingRepository } from "./overbooking-repository";
import { PrismaOverbookingRepository } from "./prisma-overbooking-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, guarda as decisões em memória, junto da agenda em memória.
 */
export function createOverbookingRepository(): OverbookingRepository {
  if (hasDatabaseConfig()) {
    return new PrismaOverbookingRepository();
  }
  return new InMemoryOverbookingRepository();
}
