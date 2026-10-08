import {
  clinicToday,
  collectRecoveredSlots,
  computeRecoveryMetrics,
  periodContaining,
  type MetricsPeriodKind,
  type RecoveryMetrics,
} from "@/domain/recovery-metrics";
import type { RecoveryMetricsDeps } from "./deps";

export type RecoveryMetricsQuery = {
  kind: MetricsPeriodKind;
  /** YYYY-MM-DD já validado; sem ele, vale o período de hoje no fuso da clínica. */
  referenceDate?: string;
};

export async function getRecoveryMetrics(
  deps: RecoveryMetricsDeps,
  { kind, referenceDate }: RecoveryMetricsQuery,
): Promise<RecoveryMetrics> {
  const period = periodContaining(kind, referenceDate ?? clinicToday(deps.now()));
  const [appointments, acceptedOffers, overbookings] = await Promise.all([
    deps.appointments.list(),
    deps.offers.listAccepted(),
    deps.overbookings.list(),
  ]);

  return computeRecoveryMetrics({
    recoveredSlots: collectRecoveredSlots({ acceptedOffers, overbookings, appointments }),
    appointments,
    period,
  });
}
