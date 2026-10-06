import type { PreparationResult } from "../appointment";

/** Pergunta do checklist, respondida com sim (vai cumprir) ou não. */
export type PreparationItem = {
  id: string;
  position: number;
  /** Texto curto para alertas, por exemplo "Jejum de 8 horas". */
  label: string;
  question: string;
};

/** Preparo exigido por um tipo de exame, ligado ao agendamento pelo nome do exame. */
export type ExamPreparation = {
  id: string;
  examName: string;
  instructions: string;
  /** Sempre em ordem de `position`. */
  items: PreparationItem[];
};

export type PreparationStatus = "pendente" | PreparationResult;

/** id do item -> resposta. Chega do corpo da requisição, por isso o valor é validado. */
export type ChecklistAnswers = Readonly<Record<string, unknown>>;
