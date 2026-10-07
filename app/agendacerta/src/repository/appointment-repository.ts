import type { Appointment, ConfirmationAction } from "@/domain/appointment";

export interface AppointmentRepository {
  list(): Promise<Appointment[]>;
  getById(id: string): Promise<Appointment | null>;
  /** Grava um agendamento novo (encaixe montado por createEncaixe). */
  create(appointment: Appointment): Promise<Appointment>;
  confirm(id: string, action: ConfirmationAction): Promise<Appointment>;
  /** Persiste vaga já transformada por offerSlot (status/paciente). */
  saveOffered(appointment: Appointment): Promise<Appointment>;
  /** Persiste a resposta do checklist já validada por answerPreparationChecklist. */
  savePreparationAnswer(appointment: Appointment): Promise<Appointment>;
  /** Persiste vaga liberada por releaseSlotForMissedPreparation (status). */
  saveReleased(appointment: Appointment): Promise<Appointment>;
}
