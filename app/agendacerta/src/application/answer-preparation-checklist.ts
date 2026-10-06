import type { Appointment } from "@/domain/appointment";
import {
  answerPreparationChecklist as applyChecklistAnswers,
  type ChecklistAnswers,
  PreparationError,
} from "@/domain/exam-preparation";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentNotFoundError } from "@/repository/errors";
import type { ExamPreparationRepository } from "@/repository/exam-preparation-repository";

/**
 * Registra a resposta do paciente ao checklist de preparo do exame.
 * Carrega o agendamento e o preparo do exame, valida no domínio e persiste.
 */
export async function answerPreparationChecklist(
  appointmentRepo: AppointmentRepository,
  preparationRepo: ExamPreparationRepository,
  appointmentId: string,
  answers: ChecklistAnswers,
  now: () => Date = () => new Date(),
): Promise<Appointment> {
  const appointment = await appointmentRepo.getById(appointmentId);
  if (!appointment) {
    throw new AppointmentNotFoundError(appointmentId);
  }

  const preparation =
    appointment.procedure.type === "exame"
      ? await preparationRepo.findByExamName(appointment.procedure.examName)
      : null;
  if (!preparation) {
    throw new PreparationError(
      "NO_PREPARATION_REQUIRED",
      `O agendamento "${appointmentId}" não tem checklist de preparo.`,
    );
  }

  const answered = applyChecklistAnswers(
    appointment,
    preparation,
    answers,
    now().toISOString(),
  );
  return appointmentRepo.savePreparationAnswer(answered);
}
