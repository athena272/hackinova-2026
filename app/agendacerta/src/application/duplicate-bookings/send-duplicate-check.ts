import {
  DuplicateBookingError,
  findDuplicateGroups,
  findGroupByAppointmentIds,
  startDuplicateCheck,
  type OpenDuplicateCheck,
} from "@/domain/duplicate-booking";
import type { DuplicateBookingDeps } from "./deps";

/**
 * Envia a confirmação reforçada pelo WhatsApp (mock) para um grupo detectado.
 * A detecção roda de novo aqui: o painel pode estar desatualizado.
 */
export async function sendDuplicateCheck(
  deps: DuplicateBookingDeps,
  appointmentIds: readonly string[],
): Promise<OpenDuplicateCheck> {
  const [appointments, checks] = await Promise.all([
    deps.appointments.list(),
    deps.duplicateChecks.list(),
  ]);

  const group = findGroupByAppointmentIds(findDuplicateGroups(appointments), appointmentIds);
  if (!group) {
    throw new DuplicateBookingError(
      "NOT_A_DUPLICATE_GROUP",
      "Estes horários não formam mais uma possível duplicidade. Atualize o painel.",
    );
  }

  const check = startDuplicateCheck({
    group,
    checks,
    appointments,
    id: deps.newCheckId(),
    sentAt: deps.now().toISOString(),
  });
  return deps.duplicateChecks.create(check);
}
