import type { MetricsPeriod, RecoveredSlot } from "./types";

/** Semana da demo: segunda 21/09 a domingo 27/09 de 2026. */
export const DEMO_WEEK: MetricsPeriod = { kind: "semana", start: "2026-09-21", end: "2026-09-27" };

export const SEPTEMBER: MetricsPeriod = { kind: "mes", start: "2026-09-01", end: "2026-09-30" };

export function recoveredSlot(overrides: Partial<RecoveredSlot> = {}): RecoveredSlot {
  return {
    origin: "leilao",
    appointmentId: "apt-006",
    scheduledAt: "2026-09-23T15:45:00-03:00",
    procedureType: "consulta",
    patientId: "pat-igor",
    ...overrides,
  };
}
