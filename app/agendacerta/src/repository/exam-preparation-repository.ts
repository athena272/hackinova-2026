import type { ExamPreparation } from "@/domain/exam-preparation";

export interface ExamPreparationRepository {
  /** Todos os preparos, com itens em ordem de `position`. */
  list(): Promise<ExamPreparation[]>;
  findByExamName(examName: string): Promise<ExamPreparation | null>;
}
