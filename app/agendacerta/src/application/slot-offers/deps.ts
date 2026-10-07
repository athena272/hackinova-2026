import { randomUUID } from "node:crypto";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { createOverbookingRepository } from "@/repository/create-overbooking-repository";
import { createPatientRepository } from "@/repository/create-patient-repository";
import { createSlotOfferRepository } from "@/repository/create-slot-offer-repository";
import { createWaitlistRepository } from "@/repository/create-waitlist-repository";
import type { OverbookingRepository } from "@/repository/overbooking-repository";
import type { PatientRepository } from "@/repository/patient-repository";
import type { SlotOfferRepository } from "@/repository/slot-offer-repository";
import type { WaitlistRepository } from "@/repository/waitlist-repository";

export type SlotOfferDeps = {
  appointments: AppointmentRepository;
  waitlist: WaitlistRepository;
  patients: PatientRepository;
  offers: SlotOfferRepository;
  /** Encaixes aceitos: vaga coberta por encaixe não abre leilão. */
  overbookings: OverbookingRepository;
  /** Relógio como parâmetro: os testes controlam a expiração. */
  now: () => Date;
  newOfferId: () => string;
  clinicNeighborhoodId: string;
};

export function createSlotOfferDeps(): SlotOfferDeps {
  return {
    appointments: createAppointmentRepository(),
    waitlist: createWaitlistRepository(),
    patients: createPatientRepository(),
    offers: createSlotOfferRepository(),
    overbookings: createOverbookingRepository(),
    now: () => new Date(),
    newOfferId: () => `offer-${randomUUID()}`,
    clinicNeighborhoodId: CLINIC_NEIGHBORHOOD_ID,
  };
}
