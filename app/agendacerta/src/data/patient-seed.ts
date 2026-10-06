import neighborhoodSeedData from "../../data/neighborhoods.seed.json";
import patientSeedData from "../../data/patients.seed.json";
import type { Neighborhood, Patient } from "@/domain/patient";
import { SeedIntegrityError } from "./seed-integrity-error";

export function loadNeighborhoodSeed(): Neighborhood[] {
  return neighborhoodSeedData.map((item) => ({ ...item }));
}

export function loadPatientSeed(): Patient[] {
  return patientSeedData.map((item) => ({ ...item }));
}

/** Busca paciente do seed por id; falha cedo se a referência estiver quebrada. */
export function createSeedPatientLookup(): (patientId: string) => Patient {
  const patients = new Map(loadPatientSeed().map((patient) => [patient.id, patient]));

  return (patientId) => {
    const patient = patients.get(patientId);
    if (!patient) {
      throw new SeedIntegrityError(
        `Paciente "${patientId}" não existe em patients.seed.json.`,
      );
    }
    return patient;
  };
}
