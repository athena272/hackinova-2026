import type { Appointment } from "@/domain/appointment";
import { createProcedure } from "@/domain/appointment";
import type { Neighborhood, PatientLocation } from "@/domain/patient";
import type { WaitlistEntry } from "@/domain/waitlist";
import type { Prisma } from "@/generated/prisma/client";

/** Nome e telefone vivem em patients; os mappers devolvem o formato plano de sempre. */
const patientSummarySelect = {
  id: true,
  fullName: true,
  phoneMasked: true,
} satisfies Prisma.PatientSelect;

export const appointmentSelect = {
  id: true,
  specialty: true,
  scheduledAt: true,
  bookedAt: true,
  status: true,
  procedureType: true,
  procedureName: true,
  patient: { select: patientSummarySelect },
} satisfies Prisma.AppointmentSelect;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

export const waitlistSelect = {
  id: true,
  specialty: true,
  status: true,
  patient: { select: patientSummarySelect },
} satisfies Prisma.WaitlistEntrySelect;

export type WaitlistRecord = Prisma.WaitlistEntryGetPayload<{
  select: typeof waitlistSelect;
}>;

export function mapRecordToAppointment(record: AppointmentRecord): Appointment {
  return {
    id: record.id,
    patientId: record.patient.id,
    patientName: record.patient.fullName,
    specialty: record.specialty,
    scheduledAt: record.scheduledAt.toISOString(),
    bookedAt: record.bookedAt.toISOString(),
    status: record.status,
    phoneMasked: record.patient.phoneMasked,
    procedure: createProcedure(record.procedureType, record.procedureName),
  };
}

export function mapRecordToWaitlistEntry(record: WaitlistRecord): WaitlistEntry {
  return {
    id: record.id,
    patientId: record.patient.id,
    patientName: record.patient.fullName,
    specialty: record.specialty,
    phoneMasked: record.patient.phoneMasked,
    status: record.status,
  };
}

export const neighborhoodSelect = {
  id: true,
  name: true,
  city: true,
  latitude: true,
  longitude: true,
} satisfies Prisma.NeighborhoodSelect;

export type NeighborhoodRecord = Prisma.NeighborhoodGetPayload<{
  select: typeof neighborhoodSelect;
}>;

export const patientLocationSelect = {
  id: true,
  neighborhood: { select: neighborhoodSelect },
} satisfies Prisma.PatientSelect;

export type PatientLocationRecord = Prisma.PatientGetPayload<{
  select: typeof patientLocationSelect;
}>;

/** numeric(9,6) chega como Decimal; seis casas cabem com folga em number. */
export function mapRecordToNeighborhood(record: NeighborhoodRecord): Neighborhood {
  return {
    id: record.id,
    name: record.name,
    city: record.city,
    latitude: record.latitude.toNumber(),
    longitude: record.longitude.toNumber(),
  };
}

export function mapRecordToPatientLocation(
  record: PatientLocationRecord,
): PatientLocation {
  return {
    patientId: record.id,
    neighborhood: record.neighborhood
      ? mapRecordToNeighborhood(record.neighborhood)
      : null,
  };
}
