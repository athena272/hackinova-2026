import type { Appointment } from "@/domain/appointment";
import { isSlotCoveredByOverbooking } from "@/domain/overbooking";
import type { SlotOfferDeps } from "./deps";

/** Lê a agenda, os encaixes e as ofertas abertas para saber se a vaga está coberta. */
export async function isCoveredByOverbooking(
  deps: Pick<SlotOfferDeps, "appointments" | "overbookings" | "offers">,
  slot: Appointment,
): Promise<boolean> {
  const [appointments, overbookings, pendingOffers] = await Promise.all([
    deps.appointments.list(),
    deps.overbookings.list(),
    deps.offers.listPending(),
  ]);
  return isSlotCoveredByOverbooking(slot, { appointments, overbookings, pendingOffers });
}
