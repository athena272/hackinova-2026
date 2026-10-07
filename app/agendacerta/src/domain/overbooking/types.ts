import type { Appointment } from "../appointment";
import type { NoShowRisk } from "../no-show-risk/types";
import type { DistanceBand } from "../slot-offer/types";

export type OverbookingDecision = "aceita" | "recusada";

/** Especialidade + instante do horário. Dois agendamentos no mesmo bloco disputam a mesma sala. */
export type SlotBlock = {
  /** Chave estável: especialidade e o instante em milissegundos, para ignorar o fuso do texto. */
  key: string;
  specialty: string;
  scheduledAt: string;
};

type OverbookingBase = {
  id: string;
  /** Agendamento de risco alto que motivou a sugestão. */
  anchorAppointmentId: string;
  specialty: string;
  scheduledAt: string;
  /** Probabilidade de falta da âncora no momento da decisão. */
  riskProbability: number;
  decidedAt: string;
};

export type AcceptedOverbooking = OverbookingBase & {
  decision: "aceita";
  /** Número do encaixe no bloco, a partir de 1. */
  sequence: number;
  encaixeAppointmentId: string;
};

export type RefusedOverbooking = OverbookingBase & {
  decision: "recusada";
  sequence: null;
  encaixeAppointmentId: null;
};

export type Overbooking = AcceptedOverbooking | RefusedOverbooking;

/** Bloco que comporta um encaixe, antes de escolher o candidato. */
export type OverbookingOpportunity = {
  block: SlotBlock;
  anchor: Appointment;
  /** O score da âncora; os motivos explicam a sugestão. */
  risk: NoShowRisk;
  acceptedCount: number;
  limit: number;
};

export type EncaixeCandidate = {
  waitlistId: string;
  patientId: string;
  patientName: string;
  distanceKm: number | null;
  band: DistanceBand;
};

export type OverbookingSuggestion = OverbookingOpportunity & {
  candidate: EncaixeCandidate;
};

/** O que o painel recebe de GET /api/overbookings. */
export type OverbookingOverview = {
  suggestions: OverbookingSuggestion[];
  /** Agendamentos criados como encaixe (badge na agenda). */
  encaixeAppointmentIds: string[];
  /** Vagas liberadas que o encaixe cobre: não abrem leilão. */
  coveredAppointmentIds: string[];
};
