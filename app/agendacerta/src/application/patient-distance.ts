import { distanceInKm } from "@/domain/no-show-risk";
import type { Neighborhood } from "@/domain/patient";
import type { PatientRepository } from "@/repository/patient-repository";

/** Distância em km do bairro do paciente até a clínica; null quando não dá para saber. */
export type PatientDistanceLookup = (patientId: string) => number | null;

/**
 * Carrega bairros e clínica uma vez e devolve a consulta por paciente.
 * Sem o bairro da clínica, registra o erro e trata toda distância como desconhecida.
 */
export async function loadPatientDistances(
  patientRepo: PatientRepository,
  clinicNeighborhoodId: string,
  logContext: string,
): Promise<PatientDistanceLookup> {
  const [locations, clinic] = await Promise.all([
    patientRepo.listLocations(),
    patientRepo.getNeighborhood(clinicNeighborhoodId),
  ]);

  if (!clinic) {
    console.error(
      `[${logContext}] bairro da clínica "${clinicNeighborhoodId}" não encontrado; distância tratada como desconhecida.`,
    );
  }

  const neighborhoodByPatient = new Map<string, Neighborhood | null>(
    locations.map((location) => [location.patientId, location.neighborhood]),
  );

  return (patientId) => {
    const home = neighborhoodByPatient.get(patientId);
    return clinic && home ? distanceInKm(home, clinic) : null;
  };
}
