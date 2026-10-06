import { isActiveBooking, type Appointment } from "../appointment";
import { findExamPreparation } from "./catalog";
import type { ExamPreparation, PreparationStatus } from "./types";

type PreparationSubject = Pick<Appointment, "status" | "preparation">;

/**
 * Resposta gravada vale sempre (inclusive na vaga já liberada, para explicar o motivo).
 * Sem resposta, só agendamento ativo de exame com preparo fica pendente:
 * exame do histórico não vira "preparo pendente".
 */
export function getPreparationStatus(
  appointment: PreparationSubject,
  requiresPreparation: boolean,
): PreparationStatus | null {
  if (appointment.preparation) return appointment.preparation.result;
  if (requiresPreparation && isActiveBooking(appointment.status)) return "pendente";
  return null;
}

/** Status do preparo consultando o cadastro; com cadastro vazio, só a resposta gravada conta. */
export function preparationStatusFor(
  appointment: PreparationSubject & Pick<Appointment, "procedure">,
  preparations: readonly ExamPreparation[],
): PreparationStatus | null {
  const requiresPreparation =
    findExamPreparation(appointment.procedure, preparations) !== null;
  return getPreparationStatus(appointment, requiresPreparation);
}

/** Paciente disse que não vai cumprir o preparo e a vaga ainda está com ele. */
export function isAwaitingPreparationRelease(appointment: PreparationSubject): boolean {
  return (
    appointment.preparation?.result === "nao_cumprido" &&
    isActiveBooking(appointment.status)
  );
}
