"use client";

import { useCallback } from "react";
import type { MetricsPeriod, RecoveryMetrics } from "@/domain/recovery-metrics";
import { type Fetcher, getApiJson } from "@/lib/http";
import { type AsyncResourceState, useAsyncResource } from "./use-async-resource";

export type RecoveryMetricsState = AsyncResourceState<RecoveryMetrics>;

const FALLBACK_ERROR = "Falha ao carregar os indicadores.";

export async function fetchRecoveryMetrics(
  period: Pick<MetricsPeriod, "kind" | "start">,
  fetcher: Fetcher = fetch,
): Promise<RecoveryMetrics> {
  const params = new URLSearchParams({ period: period.kind, reference: period.start });
  const metrics = await getApiJson<Partial<RecoveryMetrics>>(
    `/api/recovery-metrics?${params}`,
    FALLBACK_ERROR,
    fetcher,
  );
  const { recovered, noShow, prices, estimatedValue, waitlistPatientsServed, hasData } = metrics;
  if (
    !metrics.period ||
    !recovered ||
    !noShow ||
    !prices ||
    typeof estimatedValue !== "number" ||
    typeof waitlistPatientsServed !== "number" ||
    typeof hasData !== "boolean"
  ) {
    throw new Error(FALLBACK_ERROR);
  }
  return { period: metrics.period, recovered, noShow, prices, estimatedValue, waitlistPatientsServed, hasData };
}

/** Trocar o período recarrega com estado de carregamento; só a resposta mais recente vale. */
export function useRecoveryMetrics({ kind, start }: Pick<MetricsPeriod, "kind" | "start">) {
  const load = useCallback(() => fetchRecoveryMetrics({ kind, start }), [kind, start]);
  return useAsyncResource(load);
}
