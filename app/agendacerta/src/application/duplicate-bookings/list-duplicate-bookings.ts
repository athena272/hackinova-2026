import {
  buildDuplicateOverview,
  findDuplicateGroups,
  type DuplicateBookingOverview,
} from "@/domain/duplicate-booking";
import type { DuplicateBookingDeps } from "./deps";

/** Possíveis bookings duplos da agenda e o andamento das confirmações reforçadas. */
export async function listDuplicateBookings(
  deps: Pick<DuplicateBookingDeps, "appointments" | "duplicateChecks">,
): Promise<DuplicateBookingOverview> {
  const [appointments, checks] = await Promise.all([
    deps.appointments.list(),
    deps.duplicateChecks.list(),
  ]);
  return buildDuplicateOverview({
    groups: findDuplicateGroups(appointments),
    checks,
    appointments,
  });
}
