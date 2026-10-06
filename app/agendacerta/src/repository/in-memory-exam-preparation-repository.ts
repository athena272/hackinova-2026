import { loadExamPreparationSeed } from "@/data/exam-preparation-seed";
import type { ExamPreparation } from "@/domain/exam-preparation";
import type { ExamPreparationRepository } from "./exam-preparation-repository";

/** Somente leitura: o cadastro de preparo não muda durante a demonstração. */
export class InMemoryExamPreparationRepository implements ExamPreparationRepository {
  async list(): Promise<ExamPreparation[]> {
    return loadExamPreparationSeed().sort((a, b) =>
      a.examName.localeCompare(b.examName),
    );
  }

  async findByExamName(examName: string): Promise<ExamPreparation | null> {
    return (
      loadExamPreparationSeed().find((preparation) => preparation.examName === examName) ??
      null
    );
  }
}
