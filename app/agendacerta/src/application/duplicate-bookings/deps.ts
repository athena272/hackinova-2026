import { randomUUID } from "node:crypto";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { createDuplicateCheckRepository } from "@/repository/create-duplicate-check-repository";
import type { DuplicateCheckRepository } from "@/repository/duplicate-check-repository";

export type DuplicateBookingDeps = {
  appointments: AppointmentRepository;
  duplicateChecks: DuplicateCheckRepository;
  /** Relógio como parâmetro: os testes controlam as datas de envio e de resposta. */
  now: () => Date;
  newCheckId: () => string;
};

export function createDuplicateBookingDeps(): DuplicateBookingDeps {
  return {
    appointments: createAppointmentRepository(),
    duplicateChecks: createDuplicateCheckRepository(),
    now: () => new Date(),
    newCheckId: () => `dup-${randomUUID()}`,
  };
}
