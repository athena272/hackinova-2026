import type { Appointment } from "@/domain/appointment";
import type { WaitlistEntry } from "@/domain/waitlist";
import type { Prisma } from "@/generated/prisma/client";

export const appointmentSelect = {
  id: true,
  patientName: true,
  specialty: true,
  scheduledAt: true,
  status: true,
  phoneMasked: true,
} satisfies Prisma.AppointmentSelect;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

export const waitlistSelect = {
  id: true,
  patientName: true,
  specialty: true,
  phoneMasked: true,
  status: true,
} satisfies Prisma.WaitlistEntrySelect;

export type WaitlistRecord = Prisma.WaitlistEntryGetPayload<{
  select: typeof waitlistSelect;
}>;

export function mapRecordToAppointment(record: AppointmentRecord): Appointment {
  return {
    id: record.id,
    patientName: record.patientName,
    specialty: record.specialty,
    scheduledAt: record.scheduledAt.toISOString(),
    status: record.status,
    phoneMasked: record.phoneMasked,
  };
}

export function mapRecordToWaitlistEntry(record: WaitlistRecord): WaitlistEntry {
  return {
    id: record.id,
    patientName: record.patientName,
    specialty: record.specialty,
    phoneMasked: record.phoneMasked,
    status: record.status,
  };
}
