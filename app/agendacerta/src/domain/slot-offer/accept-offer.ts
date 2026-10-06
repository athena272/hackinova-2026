import type { Appointment } from "../appointment";
import { offerSlot, type OfferSlotResult } from "../offer-slot";
import type { WaitlistEntry } from "../waitlist";

/**
 * Candidato aceitou a oferta: a vaga passa para ele, já confirmada, porque
 * aceitar a oferta vale como confirmação de presença. Função pura.
 */
export function acceptSlotOffer(
  appointment: Appointment,
  candidate: WaitlistEntry,
  acceptedAt: string,
): OfferSlotResult {
  const offered = offerSlot(appointment, candidate, acceptedAt);
  return {
    ...offered,
    appointment: { ...offered.appointment, status: "confirmado" },
  };
}
