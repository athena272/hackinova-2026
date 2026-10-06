import { hasDatabaseConfig } from "@/lib/database/env";
import { InMemoryPatientRepository } from "./in-memory-patient-repository";
import type { PatientRepository } from "./patient-repository";
import { PrismaPatientRepository } from "./prisma-patient-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, cai no seed em memória.
 */
export function createPatientRepository(): PatientRepository {
  if (hasDatabaseConfig()) {
    return new PrismaPatientRepository();
  }
  return new InMemoryPatientRepository();
}
