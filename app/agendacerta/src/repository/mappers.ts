import type { Appointment, PreparationAnswer } from "@/domain/appointment";
import { createProcedure } from "@/domain/appointment";
import type { ExamPreparation } from "@/domain/exam-preparation";
import type { Neighborhood, PatientLocation } from "@/domain/patient";
import { assertSlotOfferTimeout, type SlotOffer } from "@/domain/slot-offer";
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
  preparationResult: true,
  preparationAnsweredAt: true,
  preparationMissedItemIds: true,
  patient: { select: patientSummarySelect },
} satisfies Prisma.AppointmentSelect;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

export const waitlistSelect = {
  id: true,
  specialty: true,
  status: true,
  requestedAt: true,
  patient: { select: patientSummarySelect },
} satisfies Prisma.WaitlistEntrySelect;

export type WaitlistRecord = Prisma.WaitlistEntryGetPayload<{
  select: typeof waitlistSelect;
}>;

/** O banco garante (check) que resultado e data de resposta andam juntos. */
function mapPreparationAnswer(record: AppointmentRecord): PreparationAnswer | null {
  if (record.preparationResult === null || record.preparationAnsweredAt === null) {
    return null;
  }
  return {
    result: record.preparationResult,
    missedItemIds: [...record.preparationMissedItemIds],
    answeredAt: record.preparationAnsweredAt.toISOString(),
  };
}

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
    preparation: mapPreparationAnswer(record),
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
    requestedAt: record.requestedAt.toISOString(),
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

export const examPreparationSelect = {
  id: true,
  examName: true,
  instructions: true,
  items: {
    select: { id: true, position: true, label: true, question: true },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.ExamPreparationSelect;

export type ExamPreparationRecord = Prisma.ExamPreparationGetPayload<{
  select: typeof examPreparationSelect;
}>;

export function mapRecordToExamPreparation(
  record: ExamPreparationRecord,
): ExamPreparation {
  return {
    id: record.id,
    examName: record.examName,
    instructions: record.instructions,
    items: record.items.map((item) => ({ ...item })),
  };
}

export const slotOfferSelect = {
  id: true,
  appointmentId: true,
  status: true,
  offeredAt: true,
  expiresAt: true,
  closedAt: true,
  timeoutMinutes: true,
  distanceKm: true,
  candidate: {
    select: { id: true, patient: { select: { id: true, fullName: true } } },
  },
} satisfies Prisma.SlotOfferSelect;

export type SlotOfferRecord = Prisma.SlotOfferGetPayload<{
  select: typeof slotOfferSelect;
}>;

/** O check do banco limita timeout_minutes às opções; a asserção só tipa o valor. */
export function mapRecordToSlotOffer(record: SlotOfferRecord): SlotOffer {
  assertSlotOfferTimeout(record.timeoutMinutes);
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    candidate: {
      waitlistId: record.candidate.id,
      patientId: record.candidate.patient.id,
      patientName: record.candidate.patient.fullName,
    },
    status: record.status,
    offeredAt: record.offeredAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    closedAt: record.closedAt ? record.closedAt.toISOString() : null,
    timeoutMinutes: record.timeoutMinutes,
    distanceKm: record.distanceKm ? record.distanceKm.toNumber() : null,
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
