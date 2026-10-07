import seedData from "../../data/appointments.seed.json";
import type { Appointment, PreparationAnswer } from "@/domain/appointment";
import {
  createProcedure,
  isAppointmentStatus,
  isPreparationResult,
  isProcedureType,
} from "@/domain/appointment";
import { createSeedClinicUnitLookup } from "./clinic-unit-seed";
import { createSeedPatientLookup } from "./patient-seed";
import { SeedIntegrityError } from "./seed-integrity-error";

type SeedPreparation = (typeof seedData)[number]["preparation"];

function toPreparationAnswer(
  appointmentId: string,
  preparation: SeedPreparation,
): PreparationAnswer | null {
  if (preparation === null) return null;
  if (!isPreparationResult(preparation.result)) {
    throw new SeedIntegrityError(
      `Resultado de preparo "${preparation.result}" inválido no agendamento "${appointmentId}".`,
    );
  }
  return {
    result: preparation.result,
    missedItemIds: [...preparation.missedItemIds],
    answeredAt: preparation.answeredAt,
  };
}

export function loadAppointmentSeed(): Appointment[] {
  const findPatient = createSeedPatientLookup();
  const findUnit = createSeedClinicUnitLookup();
  const seedIds = new Set(seedData.map((item) => item.id));

  return seedData.map((item) => {
    if (item.returnOfAppointmentId !== null && !seedIds.has(item.returnOfAppointmentId)) {
      throw new SeedIntegrityError(
        `Retorno "${item.id}" aponta para o agendamento inexistente "${item.returnOfAppointmentId}".`,
      );
    }
    if (!isAppointmentStatus(item.status)) {
      throw new SeedIntegrityError(
        `Status "${item.status}" inválido no agendamento "${item.id}".`,
      );
    }
    if (!isProcedureType(item.procedureType)) {
      throw new SeedIntegrityError(
        `Tipo de procedimento "${item.procedureType}" inválido no agendamento "${item.id}".`,
      );
    }

    const patient = findPatient(item.patientId);
    return {
      id: item.id,
      patientId: patient.id,
      patientName: patient.fullName,
      specialty: item.specialty,
      scheduledAt: item.scheduledAt,
      bookedAt: item.bookedAt,
      status: item.status,
      phoneMasked: patient.phoneMasked,
      procedure: createProcedure(item.procedureType, item.procedureName),
      preparation: toPreparationAnswer(item.id, item.preparation),
      unit: findUnit(item.unitId),
      returnOfAppointmentId: item.returnOfAppointmentId,
    };
  });
}
