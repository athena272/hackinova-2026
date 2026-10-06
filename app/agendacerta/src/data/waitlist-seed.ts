import seedData from "../../data/waitlist.seed.json";
import type { WaitlistEntry } from "@/domain/waitlist";
import { isWaitlistStatus } from "@/domain/waitlist";
import { createSeedPatientLookup } from "./patient-seed";
import { SeedIntegrityError } from "./seed-integrity-error";

export function loadWaitlistSeed(): WaitlistEntry[] {
  const findPatient = createSeedPatientLookup();

  return seedData.map((item) => {
    if (!isWaitlistStatus(item.status)) {
      throw new SeedIntegrityError(
        `Status "${item.status}" inválido na lista de espera "${item.id}".`,
      );
    }

    const requestedAtMs = Date.parse(item.requestedAt);
    if (Number.isNaN(requestedAtMs)) {
      throw new SeedIntegrityError(
        `Data de entrada "${item.requestedAt}" inválida na lista de espera "${item.id}".`,
      );
    }

    const patient = findPatient(item.patientId);
    return {
      id: item.id,
      patientId: patient.id,
      patientName: patient.fullName,
      specialty: item.specialty,
      phoneMasked: patient.phoneMasked,
      status: item.status,
      requestedAt: new Date(requestedAtMs).toISOString(),
    };
  });
}
