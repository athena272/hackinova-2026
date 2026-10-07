import { isActiveBooking, isSlotReusable, type Appointment } from "../appointment";
import type { SlotOffer } from "../slot-offer/types";
import { overbookingsOfBlock, slotBlockOf } from "./blocks";
import type { Overbooking } from "./types";

export type CoverageInput = {
  appointments: readonly Appointment[];
  overbookings: readonly Overbooking[];
  /** Ofertas de vaga ainda aguardando resposta. */
  pendingOffers: readonly Pick<SlotOffer, "appointmentId">[];
};

/**
 * Num bloco que recebeu encaixe, a sala já tem gente a mais. Quando alguém
 * desse bloco cancela, o cancelamento só libera o encaixe: a vaga fica
 * coberta e não abre leilão enquanto o bloco ainda tiver um agendamento ativo
 * ou uma oferta em aberto. Num bloco sem encaixe aceito, nada muda.
 */
export function isSlotCoveredByOverbooking(
  slot: Appointment,
  { appointments, overbookings, pendingOffers }: CoverageInput,
): boolean {
  if (!isSlotReusable(slot.status)) return false;

  const block = slotBlockOf(slot);
  const hasAcceptedEncaixe = overbookingsOfBlock(overbookings, block).some(
    (overbooking) => overbooking.decision === "aceita",
  );
  if (!hasAcceptedEncaixe) return false;

  const offeredIds = new Set(pendingOffers.map((offer) => offer.appointmentId));
  return appointments.some(
    (other) =>
      other.id !== slot.id &&
      slotBlockOf(other).key === block.key &&
      (isActiveBooking(other.status) || offeredIds.has(other.id)),
  );
}

export function coveredAppointmentIds(input: CoverageInput): Set<string> {
  const ids = new Set<string>();
  for (const appointment of input.appointments) {
    if (isSlotCoveredByOverbooking(appointment, input)) ids.add(appointment.id);
  }
  return ids;
}
