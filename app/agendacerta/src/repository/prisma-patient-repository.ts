import type { Neighborhood, PatientLocation } from "@/domain/patient";
import type { PrismaClient } from "@/generated/prisma/client";
import { describeDatabaseError } from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import {
  mapRecordToNeighborhood,
  mapRecordToPatientLocation,
  neighborhoodSelect,
  patientLocationSelect,
} from "./mappers";
import type { PatientRepository } from "./patient-repository";

type PatientClient = Pick<PrismaClient, "patient" | "neighborhood">;

export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly getClient: () => PatientClient = getPrisma) {}

  async listLocations(): Promise<PatientLocation[]> {
    try {
      const records = await this.getClient().patient.findMany({
        select: patientLocationSelect,
        orderBy: { id: "asc" },
      });
      return records.map(mapRecordToPatientLocation);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar bairros dos pacientes", error);
    }
  }

  async getNeighborhood(id: string): Promise<Neighborhood | null> {
    try {
      const record = await this.getClient().neighborhood.findUnique({
        where: { id },
        select: neighborhoodSelect,
      });
      return record ? mapRecordToNeighborhood(record) : null;
    } catch (error) {
      throw describeDatabaseError("Falha ao buscar bairro", error);
    }
  }
}
