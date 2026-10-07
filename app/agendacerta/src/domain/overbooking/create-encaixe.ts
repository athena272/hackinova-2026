import type { Appointment } from "../appointment";
import { bookingTimeFor } from "../offer-slot";
import type { WaitlistEntry } from "../waitlist";
import { OverbookingError } from "./errors";
import type { AcceptedOverbooking, OverbookingOpportunity, RefusedOverbooking } from "./types";

export type CreateEncaixeInput = {
  opportunity: OverbookingOpportunity;
  candidate: WaitlistEntry;
  encaixeId: string;
  overbookingId: string;
  decidedAt: string;
};

export type CreateEncaixeResult = {
  appointment: Appointment;
  candidate: WaitlistEntry;
  overbooking: AcceptedOverbooking;
};

/**
 * Monta o agendamento encaixe no horário da âncora, para o candidato da lista
 * de espera. Entra pendente, como qualquer marcação nova, e sem resposta de
 * preparo: quem responde é o paciente do encaixe. Função pura.
 */
export function createEncaixe({
  opportunity,
  candidate,
  encaixeId,
  overbookingId,
  decidedAt,
}: CreateEncaixeInput): CreateEncaixeResult {
  const { anchor, risk, block, acceptedCount } = opportunity;

  if (candidate.status !== "aguardando" || candidate.specialty !== anchor.specialty) {
    throw new OverbookingError(
      "NO_CANDIDATES",
      `O candidato "${candidate.id}" não está aguardando vaga de ${anchor.specialty}.`,
    );
  }

  return {
    appointment: {
      id: encaixeId,
      patientId: candidate.patientId,
      patientName: candidate.patientName,
      phoneMasked: candidate.phoneMasked,
      specialty: anchor.specialty,
      scheduledAt: anchor.scheduledAt,
      bookedAt: bookingTimeFor(anchor.scheduledAt, decidedAt),
      status: "pendente",
      procedure: anchor.procedure,
      preparation: null,
      unit: anchor.unit,
      returnOfAppointmentId: null,
    },
    candidate: { ...candidate, status: "atribuido" },
    overbooking: {
      id: overbookingId,
      anchorAppointmentId: anchor.id,
      specialty: block.specialty,
      scheduledAt: anchor.scheduledAt,
      decision: "aceita",
      sequence: acceptedCount + 1,
      encaixeAppointmentId: encaixeId,
      riskProbability: risk.probability,
      decidedAt,
    },
  };
}

export type RefuseOverbookingInput = {
  opportunity: OverbookingOpportunity;
  overbookingId: string;
  decidedAt: string;
};

export function refuseOverbooking({
  opportunity,
  overbookingId,
  decidedAt,
}: RefuseOverbookingInput): RefusedOverbooking {
  return {
    id: overbookingId,
    anchorAppointmentId: opportunity.anchor.id,
    specialty: opportunity.block.specialty,
    scheduledAt: opportunity.anchor.scheduledAt,
    decision: "recusada",
    sequence: null,
    encaixeAppointmentId: null,
    riskProbability: opportunity.risk.probability,
    decidedAt,
  };
}
