import type { Appointment } from "../appointment";
import type { NoShowRisk, RiskBand } from "../no-show-risk/types";
import type { RankableCandidate } from "../slot-offer/types";
import type { AcceptedOverbooking, RefusedOverbooking } from "./types";

export const DECIDED_AT = "2026-09-20T12:00:00.000Z";
export const SLOT_AT = "2026-09-22T12:00:00.000Z";

export function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-001",
    patientId: "pat-ana",
    patientName: "Ana Souza",
    specialty: "Neurologia",
    scheduledAt: SLOT_AT,
    bookedAt: "2026-08-01T12:00:00.000Z",
    status: "pendente",
    phoneMasked: "(79) 9****-1111",
    procedure: { type: "consulta" },
    preparation: null,
    ...overrides,
  };
}

const PROBABILITY_BY_BAND: Record<RiskBand, number> = { baixo: 12, medio: 35, alto: 64 };

export function risk(
  appointmentId: string,
  band: RiskBand,
  probability = PROBABILITY_BY_BAND[band],
): NoShowRisk {
  return {
    appointmentId,
    probability,
    band,
    reasons: [
      { factor: "historico", points: 20, description: "Faltou em 2 das últimas 3 consultas." },
    ],
  };
}

export function risksOf(...items: NoShowRisk[]): Map<string, NoShowRisk> {
  return new Map(items.map((item) => [item.appointmentId, item]));
}

export function waitingCandidate(overrides: Partial<RankableCandidate> = {}): RankableCandidate {
  return {
    id: "wl-001",
    patientId: "pat-helena",
    patientName: "Helena Dias",
    specialty: "Neurologia",
    phoneMasked: "(79) 9****-2222",
    status: "aguardando",
    requestedAt: "2026-08-01T12:00:00.000Z",
    distanceKm: 2.1,
    ...overrides,
  };
}

export function accepted(overrides: Partial<AcceptedOverbooking> = {}): AcceptedOverbooking {
  return {
    id: "ovb-1",
    anchorAppointmentId: "apt-001",
    specialty: "Neurologia",
    scheduledAt: SLOT_AT,
    decision: "aceita",
    sequence: 1,
    encaixeAppointmentId: "apt-enc-1",
    riskProbability: 64,
    decidedAt: DECIDED_AT,
    ...overrides,
  };
}

export function refused(overrides: Partial<RefusedOverbooking> = {}): RefusedOverbooking {
  return {
    id: "ovb-2",
    anchorAppointmentId: "apt-001",
    specialty: "Neurologia",
    scheduledAt: SLOT_AT,
    decision: "recusada",
    sequence: null,
    encaixeAppointmentId: null,
    riskProbability: 64,
    decidedAt: DECIDED_AT,
    ...overrides,
  };
}
