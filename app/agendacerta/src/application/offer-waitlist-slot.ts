import type { Appointment } from "@/domain/appointment";
import { offerSlot } from "@/domain/offer-slot";
import type { WaitlistEntry } from "@/domain/waitlist";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import {
  AppointmentNotFoundError,
  WaitlistNotFoundError,
} from "@/repository/errors";
import type { WaitlistRepository } from "@/repository/waitlist-repository";

export type OfferWaitlistSlotResult = {
  appointment: Appointment;
  candidate: WaitlistEntry;
};

/**
 * Oferece vaga liberada a um candidato da lista de espera.
 * Carrega, valida no domínio e persiste appointment + waitlist.
 */
export async function offerWaitlistSlot(
  appointmentRepo: AppointmentRepository,
  waitlistRepo: WaitlistRepository,
  appointmentId: string,
  waitlistId: string,
): Promise<OfferWaitlistSlotResult> {
  const appointment = await appointmentRepo.getById(appointmentId);
  if (!appointment) {
    throw new AppointmentNotFoundError(appointmentId);
  }

  const candidate = await waitlistRepo.getById(waitlistId);
  if (!candidate) {
    throw new WaitlistNotFoundError(waitlistId);
  }

  const offered = offerSlot(appointment, candidate);
  const savedAppointment = await appointmentRepo.saveOffered(
    offered.appointment,
  );
  const savedCandidate = await waitlistRepo.saveAssigned(offered.candidate);

  return {
    appointment: savedAppointment,
    candidate: savedCandidate,
  };
}
