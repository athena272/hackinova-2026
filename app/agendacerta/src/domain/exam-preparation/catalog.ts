import type { Procedure } from "../appointment";
import type { ExamPreparation } from "./types";

/** Preparo do exame do agendamento; consulta ou exame sem cadastro devolve null. */
export function findExamPreparation(
  procedure: Procedure,
  preparations: readonly ExamPreparation[],
): ExamPreparation | null {
  if (procedure.type !== "exame") return null;
  return (
    preparations.find((preparation) => preparation.examName === procedure.examName) ??
    null
  );
}

/** Rótulos dos itens não cumpridos; item fora do cadastro aparece pelo id. */
export function missedItemLabels(
  missedItemIds: readonly string[],
  preparation: ExamPreparation | null,
): string[] {
  const labelById = new Map(
    (preparation?.items ?? []).map((item) => [item.id, item.label]),
  );
  return missedItemIds.map((id) => labelById.get(id) ?? id);
}
