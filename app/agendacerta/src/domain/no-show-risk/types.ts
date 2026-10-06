import type { Appointment } from "../appointment";

export type RiskBand = "baixo" | "medio" | "alto";

export type RiskFactor =
  | "historico"
  | "especialidade"
  | "dia_horario"
  | "antecedencia"
  | "distancia";

/** Contribuição de um fator, em pontos percentuais, com o motivo em linguagem natural. */
export type RiskReason = {
  factor: RiskFactor;
  points: number;
  description: string;
};

export type NoShowRisk = {
  appointmentId: string;
  /** Chance estimada de falta, de 0 a 100. */
  probability: number;
  band: RiskBand;
  /** Todos os fatores, do maior para o menor impacto. */
  reasons: RiskReason[];
};

export type RiskTarget = Pick<
  Appointment,
  "id" | "patientId" | "specialty" | "scheduledAt" | "bookedAt"
>;

export type HistoryEntry = Pick<Appointment, "patientId" | "scheduledAt" | "status">;

export type NoShowRiskInput = {
  appointment: RiskTarget;
  /** Pode conter outros pacientes e consultas futuras; o fator de histórico filtra. */
  history: readonly HistoryEntry[];
  /** null quando o bairro do paciente ou da clínica é desconhecido. */
  distanceKm: number | null;
};
