import type { Appointment } from "@/domain/appointment";
import { isSlotReusable } from "@/domain/appointment";
import {
  pickNextOffer,
  type SlotOffer,
  type SlotOfferTimeout,
} from "@/domain/slot-offer";
import { SlotOfferConflictError } from "@/repository/errors";
import { loadPatientDistances } from "../patient-distance";
import type { SlotOfferDeps } from "./deps";
import { isCoveredByOverbooking } from "./overbooking-coverage";

/**
 * Ordena a fila e grava a oferta para o próximo candidato. Devolve null quando
 * a fila acabou. Se o banco recusar por já existir oferta aberta, lança
 * SlotOfferConflictError (quem chama decide se é erro ou corrida inofensiva).
 */
export async function offerToNextCandidate(
  deps: SlotOfferDeps,
  appointment: Appointment,
  timeoutMinutes: SlotOfferTimeout,
  offeredAt: string,
): Promise<SlotOffer | null> {
  const [offersOfAppointment, pendingOffers, waiting, distanceFor] = await Promise.all([
    deps.offers.listByAppointment(appointment.id),
    deps.offers.listPending(),
    deps.waitlist.listBySpecialty(appointment.specialty),
    loadPatientDistances(deps.patients, deps.clinicNeighborhoodId, "slotOffers"),
  ]);

  const next = pickNextOffer({
    id: deps.newOfferId(),
    appointment,
    candidates: waiting.map((entry) => ({
      ...entry,
      distanceKm: distanceFor(entry.patientId),
    })),
    offersOfAppointment,
    pendingOffers,
    offeredAt,
    timeoutMinutes,
  });

  return next ? deps.offers.create(next) : null;
}

/**
 * Repasse depois de recusa ou expiração. A vaga pode ter deixado de estar
 * liberada no meio do caminho, ou ter passado a ser coberta por um encaixe;
 * e, se outra requisição já repassou ao mesmo tempo, o índice único impede a
 * oferta dupla e aqui só não se faz nada.
 */
export async function passSlotToNextCandidate(
  deps: SlotOfferDeps,
  closedOffer: SlotOffer,
  offeredAt: string,
): Promise<SlotOffer | null> {
  const appointment = await deps.appointments.getById(closedOffer.appointmentId);
  if (!appointment || !isSlotReusable(appointment.status)) {
    return null;
  }
  if (await isCoveredByOverbooking(deps, appointment)) {
    return null;
  }

  try {
    return await offerToNextCandidate(
      deps,
      appointment,
      closedOffer.timeoutMinutes,
      offeredAt,
    );
  } catch (error) {
    if (error instanceof SlotOfferConflictError) {
      return null;
    }
    throw error;
  }
}
