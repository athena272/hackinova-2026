import type { Neighborhood, PatientLocation } from "@/domain/patient";

export interface PatientRepository {
  /** Bairro de cada paciente, para estimar a distância até a clínica. */
  listLocations(): Promise<PatientLocation[]>;
  getNeighborhood(id: string): Promise<Neighborhood | null>;
}
