import {
  assertCanStartCascade,
  assertSlotOfferTimeout,
  SlotOfferError,
  type SlotOffer,
} from "@/domain/slot-offer";
import { AppointmentNotFoundError } from "@/repository/errors";
import type { SlotOfferDeps } from "./deps";
import { offerToNextCandidate } from "./offer-to-next-candidate";
import { isCoveredByOverbooking } from "./overbooking-coverage";
import { syncSlotOffers } from "./sync-slot-offers";

/** Começa a cascata da vaga liberada com o prazo escolhido pela clínica. */
export async function startSlotOffer(
  deps: SlotOfferDeps,
  appointmentId: string,
  timeoutMinutes: unknown,
): Promise<SlotOffer> {
  assertSlotOfferTimeout(timeoutMinutes);
  await syncSlotOffers(deps);

  const appointment = await deps.appointments.getById(appointmentId);
  if (!appointment) {
    throw new AppointmentNotFoundError(appointmentId);
  }

  assertCanStartCascade(appointment, await deps.offers.listByAppointment(appointmentId));
  if (await isCoveredByOverbooking(deps, appointment)) {
    throw new SlotOfferError(
      "SLOT_COVERED_BY_OVERBOOKING",
      "Este horário já tem encaixe: o cancelamento só libera o encaixe e não abre leilão.",
    );
  }

  const offer = await offerToNextCandidate(
    deps,
    appointment,
    timeoutMinutes,
    deps.now().toISOString(),
  );
  if (!offer) {
    throw new SlotOfferError(
      "NO_CANDIDATES",
      `Ninguém na lista de espera de ${appointment.specialty} pode receber esta vaga agora.`,
    );
  }
  return offer;
}
