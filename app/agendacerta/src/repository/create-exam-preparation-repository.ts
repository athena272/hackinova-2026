import { hasDatabaseConfig } from "@/lib/database/env";
import type { ExamPreparationRepository } from "./exam-preparation-repository";
import { InMemoryExamPreparationRepository } from "./in-memory-exam-preparation-repository";
import { PrismaExamPreparationRepository } from "./prisma-exam-preparation-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, cai no seed em memória.
 */
export function createExamPreparationRepository(): ExamPreparationRepository {
  if (hasDatabaseConfig()) {
    return new PrismaExamPreparationRepository();
  }
  return new InMemoryExamPreparationRepository();
}
