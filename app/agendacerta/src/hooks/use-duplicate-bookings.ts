"use client";

import type {
  DuplicateBookingOverview,
  DuplicateCheckResolution,
  OpenDuplicateCheck,
} from "@/domain/duplicate-booking";
import { type Fetcher, getApiJson, postApiJson } from "@/lib/http";
import { type AsyncResourceState, useAsyncResource } from "./use-async-resource";

export type DuplicateBookingsState = AsyncResourceState<DuplicateBookingOverview>;

const FALLBACK_ERROR = "Falha ao carregar as possíveis duplicidades.";

export async function fetchDuplicateBookings(
  fetcher: Fetcher = fetch,
): Promise<DuplicateBookingOverview> {
  const overview = await getApiJson<Partial<DuplicateBookingOverview>>(
    "/api/duplicate-bookings",
    FALLBACK_ERROR,
    fetcher,
  );
  const { alerts, flaggedAppointmentIds, releasedAppointmentIds } = overview;
  if (!alerts || !flaggedAppointmentIds || !releasedAppointmentIds) {
    throw new Error(FALLBACK_ERROR);
  }
  return { alerts, flaggedAppointmentIds, releasedAppointmentIds };
}

export async function sendDuplicateCheck(
  appointmentIds: readonly string[],
  fetcher: Fetcher = fetch,
): Promise<OpenDuplicateCheck> {
  const { check } = await postApiJson<{ check: OpenDuplicateCheck }>(
    "/api/duplicate-bookings",
    { appointmentIds },
    "Falha ao enviar a confirmação reforçada.",
    fetcher,
  );
  return check;
}

export async function chooseDuplicateBooking(
  checkId: string,
  keepAppointmentId: string,
  fetcher: Fetcher = fetch,
): Promise<DuplicateCheckResolution> {
  return postApiJson<DuplicateCheckResolution>(
    `/api/duplicate-bookings/${encodeURIComponent(checkId)}/choice`,
    { keepAppointmentId },
    "Falha ao registrar a escolha do paciente.",
    fetcher,
  );
}

const loadDuplicateBookings = () => fetchDuplicateBookings();

export function useDuplicateBookings() {
  return useAsyncResource(loadDuplicateBookings);
}
