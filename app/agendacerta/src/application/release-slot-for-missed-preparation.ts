import type { Appointment } from "@/domain/appointment";
import { releaseSlotForMissedPreparation as releaseSlot } from "@/domain/exam-preparation";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentNotFoundError } from "@/repository/errors";

/**
 * Libera a vaga de quem não vai cumprir o preparo. Depois disso ela aparece
 * como reaproveitável e pode entrar na oferta em cascata.
 */
export async function releaseSlotForMissedPreparation(
  appointmentRepo: AppointmentRepository,
  appointmentId: string,
): Promise<Appointment> {
  const appointment = await appointmentRepo.getById(appointmentId);
  if (!appointment) {
    throw new AppointmentNotFoundError(appointmentId);
  }

  return appointmentRepo.saveReleased(releaseSlot(appointment));
}
