import type { Appointment } from "@/domain/appointment";
import {
  acceptSlotOffer,
  respondToOffer,
  SlotOfferError,
  type SlotOffer,
  type SlotOfferResponse,
} from "@/domain/slot-offer";
import type { WaitlistEntry } from "@/domain/waitlist";
import {
  AppointmentNotFoundError,
  SlotOfferNotFoundError,
  WaitlistNotFoundError,
} from "@/repository/errors";
import type { SlotOfferDeps } from "./deps";
import { passSlotToNextCandidate } from "./offer-to-next-candidate";
import { syncSlotOffers } from "./sync-slot-offers";

export type RespondSlotOfferResult =
  | { response: "aceitar"; offer: SlotOffer; appointment: Appointment; candidate: WaitlistEntry }
  | { response: "recusar"; offer: SlotOffer; nextOffer: SlotOffer | null };

function alreadyClosed(offerId: string): SlotOfferError {
  return new SlotOfferError(
    "OFFER_NOT_PENDING",
    `A oferta "${offerId}" acabou de ser encerrada por outra resposta.`,
  );
}

/**
 * Resposta do candidato. Antes, aplica os prazos vencidos: resposta depois do
 * prazo é recusada mesmo que ninguém tenha aberto o painel nesse meio tempo.
 */
export async function respondSlotOffer(
  deps: SlotOfferDeps,
  offerId: string,
  response: SlotOfferResponse,
): Promise<RespondSlotOfferResult> {
  await syncSlotOffers(deps);

  const offer = await deps.offers.getById(offerId);
  if (!offer) {
    throw new SlotOfferNotFoundError(offerId);
  }

  const respondedAt = deps.now().toISOString();
  const closed = respondToOffer(offer, response, respondedAt);

  if (response === "recusar") {
    if (!(await deps.offers.close(closed))) throw alreadyClosed(offerId);
    const nextOffer = await passSlotToNextCandidate(deps, closed, respondedAt);
    return { response, offer: closed, nextOffer };
  }

  const [appointment, candidate] = await Promise.all([
    deps.appointments.getById(offer.appointmentId),
    deps.waitlist.getById(offer.candidate.waitlistId),
  ]);
  if (!appointment) throw new AppointmentNotFoundError(offer.appointmentId);
  if (!candidate) throw new WaitlistNotFoundError(offer.candidate.waitlistId);

  // Valida antes de fechar: um erro de regra não pode deixar a oferta encerrada à toa.
  const accepted = acceptSlotOffer(appointment, candidate, respondedAt);
  if (!(await deps.offers.close(closed))) throw alreadyClosed(offerId);

  const savedAppointment = await deps.appointments.saveOffered(accepted.appointment);
  const savedCandidate = await deps.waitlist.saveAssigned(accepted.candidate);
  return {
    response,
    offer: closed,
    appointment: savedAppointment,
    candidate: savedCandidate,
  };
}
