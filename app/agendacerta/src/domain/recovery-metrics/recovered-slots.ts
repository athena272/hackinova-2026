import type { Appointment } from "../appointment";
import type { AcceptedOverbooking, Overbooking } from "../overbooking/types";
import type { SlotReleaseReason } from "../slot-offer/release-reason";
import type { SlotOffer } from "../slot-offer/types";
import type { RecoveredSlot, RecoveryOrigin } from "./types";

const ORIGIN_BY_RELEASE_REASON: Record<SlotReleaseReason, RecoveryOrigin> = {
  cancelamento: "leilao",
  preparo: "preparo",
  booking_duplo: "booking_duplo",
};

export type RecoveredSlotsInput = {
  acceptedOffers: readonly SlotOffer[];
  overbookings: readonly Overbooking[];
  appointments: readonly Appointment[];
};

/**
 * Cada aceite conta uma recuperação: a mesma vaga cancelada de novo e preenchida outra vez
 * conta duas. Registro sem agendamento correspondente fica de fora (o banco garante por FK).
 */
export function collectRecoveredSlots({
  acceptedOffers,
  overbookings,
  appointments,
}: RecoveredSlotsInput): RecoveredSlot[] {
  const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]));

  const fromCascade = acceptedOffers
    .filter((offer) => offer.status === "aceita")
    .flatMap((offer): RecoveredSlot[] => {
      const slot = appointmentsById.get(offer.appointmentId);
      if (!slot) return [];
      return [
        {
          origin: ORIGIN_BY_RELEASE_REASON[offer.releaseReason],
          appointmentId: slot.id,
          scheduledAt: slot.scheduledAt,
          procedureType: slot.procedure.type,
          patientId: offer.candidate.patientId,
        },
      ];
    });

  const fromEncaixes = overbookings
    .filter((overbooking): overbooking is AcceptedOverbooking => overbooking.decision === "aceita")
    .flatMap((overbooking): RecoveredSlot[] => {
      const encaixe = appointmentsById.get(overbooking.encaixeAppointmentId);
      if (!encaixe) return [];
      return [
        {
          origin: "overbooking",
          appointmentId: encaixe.id,
          scheduledAt: overbooking.scheduledAt,
          procedureType: encaixe.procedure.type,
          patientId: encaixe.patientId,
        },
      ];
    });

  return [...fromCascade, ...fromEncaixes];
}
