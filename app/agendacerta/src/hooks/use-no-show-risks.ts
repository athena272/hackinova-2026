"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NoShowRisk } from "@/domain/no-show-risk";
import { readResponseJson } from "@/lib/http";

export type NoShowRisksState =
  | { status: "loading" }
  | { status: "ready"; risksById: ReadonlyMap<string, NoShowRisk> }
  | { status: "error"; message: string };

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchNoShowRisks(
  fetcher: Fetcher = fetch,
): Promise<ReadonlyMap<string, NoShowRisk>> {
  const response = await fetcher("/api/appointments/risk", { cache: "no-store" });
  const payload = await readResponseJson<{ risks?: NoShowRisk[]; error?: string }>(
    response,
  );
  if (!response.ok || !payload.risks) {
    throw new Error(payload.error ?? "Falha ao calcular risco de falta.");
  }
  return new Map(payload.risks.map((risk) => [risk.appointmentId, risk]));
}

/** Carrega o risco à parte da agenda: se falhar, a agenda continua utilizável. */
export function useNoShowRisks() {
  const [state, setState] = useState<NoShowRisksState>({ status: "loading" });
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setState({ status: "loading" });
    try {
      const risksById = await fetchNoShowRisks();
      if (requestId === latestRequest.current) {
        setState({ status: "ready", risksById });
      }
    } catch (err) {
      if (requestId === latestRequest.current) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro inesperado.",
        });
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
