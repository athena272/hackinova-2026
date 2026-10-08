import type { AppointmentRepository } from "@/repository/appointment-repository";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { createOverbookingRepository } from "@/repository/create-overbooking-repository";
import { createSlotOfferRepository } from "@/repository/create-slot-offer-repository";
import type { OverbookingRepository } from "@/repository/overbooking-repository";
import type { SlotOfferRepository } from "@/repository/slot-offer-repository";

export type RecoveryMetricsDeps = {
  appointments: AppointmentRepository;
  offers: SlotOfferRepository;
  overbookings: OverbookingRepository;
  /** Define o período atual quando a tela não informa a data de referência. */
  now: () => Date;
};

export function createRecoveryMetricsDeps(): RecoveryMetricsDeps {
  return {
    appointments: createAppointmentRepository(),
    offers: createSlotOfferRepository(),
    overbookings: createOverbookingRepository(),
    now: () => new Date(),
  };
}
