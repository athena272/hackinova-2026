import { isActiveBooking, type AppointmentStatus } from "../appointment";
import {
  distanceFactor,
  historyFactor,
  leadTimeFactor,
  scheduleFactor,
  specialtyFactor,
} from "./risk-factors";
import { NO_SHOW_RISK_WEIGHTS, type NoShowRiskWeights } from "./risk-weights";
import type { NoShowRisk, NoShowRiskInput, RiskBand, RiskReason } from "./types";

/** Só faz sentido prever falta de consulta que ainda vai acontecer com paciente marcado. */
export function isRiskScorable(status: AppointmentStatus): boolean {
  return isActiveBooking(status);
}

export function riskBandFor(
  probability: number,
  weights: NoShowRiskWeights = NO_SHOW_RISK_WEIGHTS,
): RiskBand {
  if (probability >= weights.bands.high) return "alto";
  if (probability >= weights.bands.medium) return "medio";
  return "baixo";
}

const byImpact = (a: RiskReason, b: RiskReason) =>
  Math.abs(b.points) - Math.abs(a.points);

/**
 * Probabilidade = base + soma dos pontos de cada fator, limitada à faixa
 * configurada. Regra explicável de propósito: cada ponto tem um motivo.
 */
export function calculateNoShowRisk(
  { appointment, history, distanceKm }: NoShowRiskInput,
  weights: NoShowRiskWeights = NO_SHOW_RISK_WEIGHTS,
): NoShowRisk {
  const reasons: RiskReason[] = [
    historyFactor(appointment, history, weights.history),
    specialtyFactor(appointment, weights.specialty),
    scheduleFactor(appointment, weights.schedule),
    leadTimeFactor(appointment, weights.leadTime),
    distanceFactor(distanceKm, weights.distance),
  ];

  const raw =
    weights.baseProbability +
    reasons.reduce((total, reason) => total + reason.points, 0);
  const probability = Math.min(
    weights.maxProbability,
    Math.max(weights.minProbability, Math.round(raw)),
  );

  return {
    appointmentId: appointment.id,
    probability,
    band: riskBandFor(probability, weights),
    reasons: [...reasons].sort(byImpact),
  };
}
