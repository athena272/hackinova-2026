import {
  resolveDuplicateCheck,
  type DuplicateCheckResolution,
} from "@/domain/duplicate-booking";
import { DuplicateCheckNotFoundError } from "@/repository/errors";
import type { DuplicateBookingDeps } from "./deps";

/**
 * Registra o horário que o paciente quer manter. Os outros viram vaga
 * reaproveitável e podem entrar na oferta em cascata.
 */
export async function chooseDuplicateBooking(
  deps: Pick<DuplicateBookingDeps, "appointments" | "duplicateChecks" | "now">,
  checkId: string,
  keepAppointmentId: string,
): Promise<DuplicateCheckResolution> {
  const check = await deps.duplicateChecks.getById(checkId);
  if (!check) {
    throw new DuplicateCheckNotFoundError(checkId);
  }

  const resolution = resolveDuplicateCheck({
    check,
    appointments: await deps.appointments.list(),
    keepAppointmentId,
    resolvedAt: deps.now().toISOString(),
  });
  const saved = await deps.duplicateChecks.resolve(resolution);
  return { ...resolution, check: saved };
}
