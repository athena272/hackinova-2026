import examPreparationSeedData from "../../data/exam-preparations.seed.json";
import type { ExamPreparation } from "@/domain/exam-preparation";

export function loadExamPreparationSeed(): ExamPreparation[] {
  return examPreparationSeedData.map((preparation) => ({
    ...preparation,
    items: [...preparation.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ ...item })),
  }));
}
