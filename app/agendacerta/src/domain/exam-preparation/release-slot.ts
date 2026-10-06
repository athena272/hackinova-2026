import { isActiveBooking, type Appointment } from "../appointment";
import { PreparationError } from "./errors";

/**
 * Libera a vaga de quem não vai cumprir o preparo, para a clínica oferecer
 * à lista de espera com antecedência. A resposta continua gravada para
 * explicar por que a vaga foi liberada.
 * Função pura: não persiste nada.
 */
export function releaseSlotForMissedPreparation(appointment: Appointment): Appointment {
  if (appointment.preparation?.result !== "nao_cumprido") {
    throw new PreparationError(
      "PREPARATION_NOT_MISSED",
      `O agendamento "${appointment.id}" não tem preparo marcado como não cumprido.`,
    );
  }

  if (!isActiveBooking(appointment.status)) {
    throw new PreparationError(
      "SLOT_NOT_ACTIVE",
      `Não é possível liberar uma vaga com status "${appointment.status}".`,
    );
  }

  return { ...appointment, status: "liberado" };
}
