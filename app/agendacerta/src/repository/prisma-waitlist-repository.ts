import type { WaitlistEntry } from "@/domain/waitlist";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  describeDatabaseError,
  isRecordNotFoundError,
} from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import { WaitlistNotFoundError } from "./errors";
import { mapRecordToWaitlistEntry, waitlistSelect } from "./mappers";
import type { WaitlistRepository } from "./waitlist-repository";

type WaitlistClient = Pick<PrismaClient, "waitlistEntry">;

export class PrismaWaitlistRepository implements WaitlistRepository {
  constructor(private readonly getClient: () => WaitlistClient = getPrisma) {}

  async listBySpecialty(specialty: string): Promise<WaitlistEntry[]> {
    try {
      const records = await this.getClient().waitlistEntry.findMany({
        where: { specialty, status: "aguardando" },
        select: waitlistSelect,
        orderBy: { id: "asc" },
      });
      return records.map(mapRecordToWaitlistEntry);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar lista de espera", error);
    }
  }

  async getById(id: string): Promise<WaitlistEntry | null> {
    try {
      const record = await this.getClient().waitlistEntry.findUnique({
        where: { id },
        select: waitlistSelect,
      });
      return record ? mapRecordToWaitlistEntry(record) : null;
    } catch (error) {
      throw describeDatabaseError(
        "Falha ao buscar candidato da lista de espera",
        error,
      );
    }
  }

  async saveAssigned(entry: WaitlistEntry): Promise<WaitlistEntry> {
    try {
      const record = await this.getClient().waitlistEntry.update({
        where: { id: entry.id },
        data: { status: entry.status },
        select: waitlistSelect,
      });
      return mapRecordToWaitlistEntry(record);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new WaitlistNotFoundError(entry.id);
      }
      throw describeDatabaseError("Falha ao atualizar lista de espera", error);
    }
  }
}
