import { randomUUID } from "node:crypto";
import { createSlotOfferDeps, type SlotOfferDeps } from "../slot-offers/deps";

export type OverbookingDeps = Pick<
  SlotOfferDeps,
  | "appointments"
  | "waitlist"
  | "patients"
  | "offers"
  | "overbookings"
  | "now"
  | "clinicNeighborhoodId"
> & {
  newEncaixeId: () => string;
  newOverbookingId: () => string;
};

/** Mesmos repositórios do leilão: os dois fluxos leem a mesma agenda e as mesmas ofertas. */
export function createOverbookingDeps(): OverbookingDeps {
  const { appointments, waitlist, patients, offers, overbookings, now, clinicNeighborhoodId } =
    createSlotOfferDeps();
  return {
    appointments,
    waitlist,
    patients,
    offers,
    overbookings,
    now,
    clinicNeighborhoodId,
    newEncaixeId: () => `apt-enc-${randomUUID()}`,
    newOverbookingId: () => `ovb-${randomUUID()}`,
  };
}
