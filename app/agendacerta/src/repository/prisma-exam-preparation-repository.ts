import type { ExamPreparation } from "@/domain/exam-preparation";
import type { PrismaClient } from "@/generated/prisma/client";
import { describeDatabaseError } from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import type { ExamPreparationRepository } from "./exam-preparation-repository";
import { examPreparationSelect, mapRecordToExamPreparation } from "./mappers";

type ExamPreparationClient = Pick<PrismaClient, "examPreparation">;

export class PrismaExamPreparationRepository implements ExamPreparationRepository {
  constructor(
    private readonly getClient: () => ExamPreparationClient = getPrisma,
  ) {}

  async list(): Promise<ExamPreparation[]> {
    try {
      const records = await this.getClient().examPreparation.findMany({
        select: examPreparationSelect,
        orderBy: { examName: "asc" },
      });
      return records.map(mapRecordToExamPreparation);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar preparos", error);
    }
  }

  async findByExamName(examName: string): Promise<ExamPreparation | null> {
    try {
      const record = await this.getClient().examPreparation.findUnique({
        where: { examName },
        select: examPreparationSelect,
      });
      return record ? mapRecordToExamPreparation(record) : null;
    } catch (error) {
      throw describeDatabaseError("Falha ao buscar preparo do exame", error);
    }
  }
}
