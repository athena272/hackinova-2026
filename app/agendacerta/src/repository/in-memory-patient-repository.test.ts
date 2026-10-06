import { describe, expect, it } from "vitest";
import { loadPatientSeed } from "@/data/patient-seed";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { InMemoryPatientRepository } from "./in-memory-patient-repository";

describe("InMemoryPatientRepository", () => {
  const repo = new InMemoryPatientRepository();

  it("devolve a localização de todos os pacientes do seed", async () => {
    const locations = await repo.listLocations();

    expect(locations.map((location) => location.patientId).sort()).toEqual(
      loadPatientSeed().map((patient) => patient.id).sort(),
    );
  });

  it("resolve o bairro do paciente pelo id do seed", async () => {
    const patient = loadPatientSeed().find((item) => item.neighborhoodId !== null);
    const locations = await repo.listLocations();

    const location = locations.find((item) => item.patientId === patient?.id);
    expect(location?.neighborhood?.id).toBe(patient?.neighborhoodId);
    expect(typeof location?.neighborhood?.latitude).toBe("number");
  });

  it("encontra o bairro da clínica e devolve null para id inexistente", async () => {
    await expect(repo.getNeighborhood(CLINIC_NEIGHBORHOOD_ID)).resolves.toMatchObject({
      id: CLINIC_NEIGHBORHOOD_ID,
    });
    await expect(repo.getNeighborhood("nb-inexistente")).resolves.toBeNull();
  });
});
