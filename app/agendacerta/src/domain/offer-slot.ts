import type { Appointment } from "./appointment";
import { isSlotReusable } from "./appointment";
import type { WaitlistEntry } from "./waitlist";

export class OfferSlotError extends Error {
  readonly code:
    | "SLOT_NOT_REUSABLE"
    | "SPECIALTY_MISMATCH"
    | "CANDIDATE_NOT_WAITING";

  constructor(
    code: OfferSlotError["code"],
    message: string,
  ) {
    super(message);
    this.name = "OfferSlotError";
    this.code = code;
  }
}

export type OfferSlotResult = {
  appointment: Appointment;
  candidate: WaitlistEntry;
};

/**
 * Oferece uma vaga reaproveitável a um candidato da lista de espera.
 * A vaga fica pendente para o novo paciente confirmar (SIM/NÃO/REMARCAR).
 * Função pura: não persiste nada.
 */
export function offerSlot(
  appointment: Appointment,
  candidate: WaitlistEntry,
): OfferSlotResult {
  if (!isSlotReusable(appointment.status)) {
    throw new OfferSlotError(
      "SLOT_NOT_REUSABLE",
      `Não é possível oferecer uma vaga com status "${appointment.status}".`,
    );
  }

  if (candidate.status !== "aguardando") {
    throw new OfferSlotError(
      "CANDIDATE_NOT_WAITING",
      `O candidato "${candidate.id}" não está aguardando (status "${candidate.status}").`,
    );
  }

  if (appointment.specialty !== candidate.specialty) {
    throw new OfferSlotError(
      "SPECIALTY_MISMATCH",
      `Especialidade da vaga (${appointment.specialty}) difere da do candidato (${candidate.specialty}).`,
    );
  }

  return {
    appointment: {
      ...appointment,
      patientName: candidate.patientName,
      phoneMasked: candidate.phoneMasked,
      status: "pendente",
    },
    candidate: {
      ...candidate,
      status: "atribuido",
    },
  };
}
