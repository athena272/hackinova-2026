import seedData from "../../data/appointments.seed.json";
import type { Appointment } from "@/domain/appointment";
import {
  createProcedure,
  isAppointmentStatus,
  isProcedureType,
} from "@/domain/appointment";
import { createSeedPatientLookup } from "./patient-seed";
import { SeedIntegrityError } from "./seed-integrity-error";

export function loadAppointmentSeed(): Appointment[] {
  const findPatient = createSeedPatientLookup();

  return seedData.map((item) => {
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
      status: item.status,
      phoneMasked: patient.phoneMasked,
      procedure: createProcedure(item.procedureType, item.procedureName),
    };
  });
}
