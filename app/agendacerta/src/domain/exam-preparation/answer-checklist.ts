import { isActiveBooking, type Appointment } from "../appointment";
import { PreparationError } from "./errors";
import type { ChecklistAnswers, ExamPreparation } from "./types";

function assertValidAnswers(
  preparation: ExamPreparation,
  answers: ChecklistAnswers,
): asserts answers is Readonly<Record<string, boolean>> {
  const knownIds = new Set(preparation.items.map((item) => item.id));
  const unknownIds = Object.keys(answers).filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new PreparationError(
      "INVALID_ANSWERS",
      `Itens que não fazem parte do preparo: ${unknownIds.join(", ")}.`,
    );
  }

  const unanswered = preparation.items.filter(
    (item) => typeof answers[item.id] !== "boolean",
  );
  if (unanswered.length > 0) {
    throw new PreparationError(
      "INVALID_ANSWERS",
      `Responda sim ou não para: ${unanswered.map((item) => item.label).join(", ")}.`,
    );
  }
}

/**
 * Registra a resposta do paciente ao checklist de preparo.
 * "Não" em qualquer item marca o preparo como não cumprido.
 * Função pura: não persiste nada.
 */
export function answerPreparationChecklist(
  appointment: Appointment,
  preparation: ExamPreparation,
  answers: ChecklistAnswers,
  answeredAt: string,
): Appointment {
  const { procedure } = appointment;
  if (procedure.type !== "exame" || procedure.examName !== preparation.examName) {
    throw new PreparationError(
      "NO_PREPARATION_REQUIRED",
      `O agendamento "${appointment.id}" não usa o preparo de "${preparation.examName}".`,
    );
  }

  if (!isActiveBooking(appointment.status)) {
    throw new PreparationError(
      "SLOT_NOT_ACTIVE",
      `Não é possível responder o preparo de uma vaga com status "${appointment.status}".`,
    );
  }

  if (appointment.preparation) {
    throw new PreparationError(
      "ALREADY_ANSWERED",
      `O checklist de preparo do agendamento "${appointment.id}" já foi respondido.`,
    );
  }

  assertValidAnswers(preparation, answers);

  const missedItemIds = [...preparation.items]
    .sort((a, b) => a.position - b.position)
    .filter((item) => answers[item.id] === false)
    .map((item) => item.id);

  return {
    ...appointment,
    preparation: {
      result: missedItemIds.length > 0 ? "nao_cumprido" : "ok",
      missedItemIds,
      answeredAt,
    },
  };
}
