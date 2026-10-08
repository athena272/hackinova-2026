import { isAttendanceOutcome, type Appointment } from "../appointment";
import { isInPeriod } from "./period";
import { AVERAGE_PRICE_BRL, RECOVERY_ORIGINS } from "./recovery-rules";
import type {
  AveragePrices,
  MetricsPeriod,
  RecoveredSlot,
  RecoveryMetrics,
  RecoveryOrigin,
} from "./types";

export type RecoveryMetricsInput = {
  recoveredSlots: readonly RecoveredSlot[];
  appointments: readonly Appointment[];
  period: MetricsPeriod;
  prices?: AveragePrices;
};

export function computeRecoveryMetrics({
  recoveredSlots,
  appointments,
  period,
  prices = AVERAGE_PRICE_BRL,
}: RecoveryMetricsInput): RecoveryMetrics {
  const slots = recoveredSlots.filter((slot) => isInPeriod(slot.scheduledAt, period));
  const byOrigin = Object.fromEntries(RECOVERY_ORIGINS.map((origin) => [origin, 0])) as Record<
    RecoveryOrigin,
    number
  >;
  for (const slot of slots) {
    byOrigin[slot.origin] += 1;
  }

  const outcomes = appointments.filter(
    (appointment) =>
      isAttendanceOutcome(appointment.status) && isInPeriod(appointment.scheduledAt, period),
  );
  const noShows = outcomes.filter((appointment) => appointment.status === "faltou").length;

  return {
    period,
    recovered: { total: slots.length, byOrigin },
    waitlistPatientsServed: new Set(slots.map((slot) => slot.patientId)).size,
    noShow: {
      noShows,
      attended: outcomes.length - noShows,
      rate: outcomes.length > 0 ? noShows / outcomes.length : null,
    },
    estimatedValue: slots.reduce((sum, slot) => sum + prices[slot.procedureType], 0),
    prices,
    hasData: slots.length > 0 || outcomes.length > 0,
  };
}
