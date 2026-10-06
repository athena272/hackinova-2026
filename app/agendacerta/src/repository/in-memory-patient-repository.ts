import { loadNeighborhoodSeed, loadPatientSeed } from "@/data/patient-seed";
import type { Neighborhood, PatientLocation } from "@/domain/patient";
import type { PatientRepository } from "./patient-repository";

/** Somente leitura: pacientes e bairros não mudam durante a demonstração. */
export class InMemoryPatientRepository implements PatientRepository {
  async listLocations(): Promise<PatientLocation[]> {
    const neighborhoods = new Map(
      loadNeighborhoodSeed().map((neighborhood) => [neighborhood.id, neighborhood]),
    );
    return loadPatientSeed().map((patient) => ({
      patientId: patient.id,
      neighborhood: patient.neighborhoodId
        ? (neighborhoods.get(patient.neighborhoodId) ?? null)
        : null,
    }));
  }

  async getNeighborhood(id: string): Promise<Neighborhood | null> {
    return loadNeighborhoodSeed().find((neighborhood) => neighborhood.id === id) ?? null;
  }
}
