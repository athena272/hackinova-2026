"use client";

import type { Appointment } from "@/domain/appointment";
import type {
  Overbooking,
  OverbookingDecisionInput,
  OverbookingOverview,
} from "@/domain/overbooking";
import { type Fetcher, getApiJson, postApiJson } from "@/lib/http";
import { type AsyncResourceState, useAsyncResource } from "./use-async-resource";

export type OverbookingsState = AsyncResourceState<OverbookingOverview>;

const FALLBACK_ERROR = "Falha ao carregar as sugestões de encaixe.";

export async function fetchOverbookings(fetcher: Fetcher = fetch): Promise<OverbookingOverview> {
  const overview = await getApiJson<Partial<OverbookingOverview>>(
    "/api/overbookings",
    FALLBACK_ERROR,
    fetcher,
  );
  const { suggestions, encaixeAppointmentIds, coveredAppointmentIds } = overview;
  if (!suggestions || !encaixeAppointmentIds || !coveredAppointmentIds) {
    throw new Error(FALLBACK_ERROR);
  }
  return { suggestions, encaixeAppointmentIds, coveredAppointmentIds };
}

export type OverbookingDecisionResult = {
  decision: OverbookingDecisionInput;
  overbooking: Overbooking;
  /** Só no aceite: o agendamento encaixe criado. */
  appointment?: Appointment;
};

export async function requestOverbookingDecision(
  anchorAppointmentId: string,
  decision: OverbookingDecisionInput,
  fetcher: Fetcher = fetch,
): Promise<OverbookingDecisionResult> {
  return postApiJson<OverbookingDecisionResult>(
    `/api/appointments/${encodeURIComponent(anchorAppointmentId)}/overbooking`,
    { decision },
    "Falha ao registrar a decisão do encaixe.",
    fetcher,
  );
}

const loadOverbookings = () => fetchOverbookings();

export function useOverbookings() {
  return useAsyncResource(loadOverbookings);
}
