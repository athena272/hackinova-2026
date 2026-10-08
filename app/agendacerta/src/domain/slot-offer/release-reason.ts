import type { Appointment } from "../appointment";
import type { DuplicateCheck } from "../duplicate-booking";
import type { SlotOffer } from "./types";

/** Por que a vaga estava livre quando foi oferecida. */
export type SlotReleaseReason = "cancelamento" | "preparo" | "booking_duplo";

export type SlotReleaseReasonInput = {
  appointment: Pick<Appointment, "id" | "preparation">;
  duplicateChecks: readonly DuplicateCheck[];
  /** Todas as ofertas já feitas para esta vaga. */
  offersOfAppointment: readonly SlotOffer[];
};

function lastAcceptanceMs(offers: readonly SlotOffer[]): number | null {
  const accepted = offers
    .filter((offer) => offer.status === "aceita" && offer.closedAt !== null)
    .map((offer) => Date.parse(offer.closedAt!));
  return accepted.length > 0 ? Math.max(...accepted) : null;
}

/**
 * Motivo da liberação, gravado em cada oferta: depois do aceite a linha do
 * agendamento é do novo paciente e o preparo é limpo, então a origem só
 * fica registrada aqui. Booking duplo só vale se a vaga não foi preenchida
 * depois da escolha do paciente; senão, o novo cancelamento é comum.
 * Função pura.
 */
export function slotReleaseReasonOf({
  appointment,
  duplicateChecks,
  offersOfAppointment,
}: SlotReleaseReasonInput): SlotReleaseReason {
  if (appointment.preparation?.result === "nao_cumprido") return "preparo";

  const refilledAt = lastAcceptanceMs(offersOfAppointment);
  const releasedByDuplicate = duplicateChecks.some(
    (check) =>
      check.status === "resolvida" &&
      check.keptAppointmentId !== appointment.id &&
      check.appointmentIds.includes(appointment.id) &&
      (refilledAt === null || Date.parse(check.resolvedAt) > refilledAt),
  );
  return releasedByDuplicate ? "booking_duplo" : "cancelamento";
}
