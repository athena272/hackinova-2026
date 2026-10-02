import { hasDatabaseConfig } from "@/lib/database/env";
import type { AppointmentRepository } from "./appointment-repository";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, cai no seed em memória (útil para testes unitários / CI sem Docker).
 */
export function createAppointmentRepository(): AppointmentRepository {
  if (hasDatabaseConfig()) {
    return new PrismaAppointmentRepository();
  }
  return new InMemoryAppointmentRepository();
}

export { AppointmentNotFoundError } from "./errors";
