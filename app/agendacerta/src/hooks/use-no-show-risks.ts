"use client";

import { useMemo } from "react";
import type { NoShowRisk } from "@/domain/no-show-risk";
import { type Fetcher, getApiJson } from "@/lib/http";
import { useAsyncResource } from "./use-async-resource";

export type NoShowRisksState =
  | { status: "loading" }
  | { status: "ready"; risksById: ReadonlyMap<string, NoShowRisk> }
  | { status: "error"; message: string };

const FALLBACK_ERROR = "Falha ao calcular risco de falta.";

export async function fetchNoShowRisks(
  fetcher: Fetcher = fetch,
): Promise<ReadonlyMap<string, NoShowRisk>> {
  const { risks } = await getApiJson<{ risks?: NoShowRisk[] }>(
    "/api/appointments/risk",
    FALLBACK_ERROR,
    fetcher,
  );
  if (!risks) {
    throw new Error(FALLBACK_ERROR);
  }
  return new Map(risks.map((risk) => [risk.appointmentId, risk]));
}

const loadNoShowRisks = () => fetchNoShowRisks();

/** Carrega o risco à parte da agenda: se falhar, a agenda continua utilizável. */
export function useNoShowRisks() {
  const { state: resource, reload } = useAsyncResource(loadNoShowRisks);

  const state = useMemo<NoShowRisksState>(
    () =>
      resource.status === "ready"
        ? { status: "ready", risksById: resource.data }
        : resource,
    [resource],
  );

  return { state, reload };
}
